import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Base64 URL encode
function base64UrlEncode(data: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...data));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Base64 URL decode
function base64UrlDecode(str: string): Uint8Array {
  const padding = '='.repeat((4 - str.length % 4) % 4);
  const base64 = (str + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return new Uint8Array([...rawData].map(char => char.charCodeAt(0)));
}

// Create VAPID JWT token
async function createVapidAuthHeader(
  endpoint: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidSubject: string
): Promise<{ authorization: string; cryptoKey: string }> {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;
  
  // JWT Header
  const header = { typ: 'JWT', alg: 'ES256' };
  const encodedHeader = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  
  // JWT Payload
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60,
    sub: vapidSubject,
  };
  const encodedPayload = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  
  // Import private key for signing
  const privateKeyBytes = base64UrlDecode(vapidPrivateKey);
  
  // For ECDSA P-256, we need to create a proper JWK
  const privateKeyJwk = {
    kty: 'EC',
    crv: 'P-256',
    d: vapidPrivateKey,
    x: vapidPublicKey.substring(0, 43),
    y: vapidPublicKey.substring(43),
  };
  
  const cryptoKey = await crypto.subtle.importKey(
    'jwk',
    privateKeyJwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );
  
  // Sign
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );
  
  // Convert signature from DER to raw format (r || s)
  const signatureBytes = new Uint8Array(signature);
  const encodedSignature = base64UrlEncode(signatureBytes);
  
  const jwt = `${unsignedToken}.${encodedSignature}`;
  
  return {
    authorization: `vapid t=${jwt}, k=${vapidPublicKey}`,
    cryptoKey: vapidPublicKey,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    const vapidEmail = Deno.env.get('VAPID_EMAIL');

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { notification_id, user_id } = await req.json();

    if (!notification_id || !user_id) {
      throw new Error('notification_id and user_id are required');
    }

    console.log('Sending push notification for:', { notification_id, user_id });

    // Fetch the notification
    const { data: notification, error: notifError } = await supabase
      .from('notifications')
      .select('title, message')
      .eq('id', notification_id)
      .single();

    if (notifError || !notification) {
      console.error('Notification not found:', notifError);
      throw new Error('Notification not found');
    }

    // Fetch all subscriptions for the user
    const { data: subscriptions, error: subsError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', user_id);

    if (subsError) {
      console.error('Error fetching subscriptions:', subsError);
      throw new Error('Error fetching subscriptions');
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No push subscriptions found for user:', user_id);
      return new Response(
        JSON.stringify({ message: 'No subscriptions found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Sending push to ${subscriptions.length} device(s)`);

    // Check if VAPID keys are configured
    if (!vapidPublicKey || !vapidPrivateKey || !vapidEmail) {
      console.log('VAPID keys not configured, returning structure ready message');
      return new Response(
        JSON.stringify({ 
          message: 'Push notification structure ready',
          note: 'VAPID keys need to be configured for real push',
          subscriptions: subscriptions.length 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload = JSON.stringify({
      title: notification.title,
      body: notification.message,
      icon: '/icon-192x192.png',
      badge: '/icon-96x96.png',
      data: {
        url: '/dashboard'
      }
    });

    let successful = 0;
    let failed = 0;

    for (const sub of subscriptions) {
      try {
        const { authorization } = await createVapidAuthHeader(
          sub.endpoint,
          vapidPublicKey,
          vapidPrivateKey,
          vapidEmail
        );

        const response = await fetch(sub.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain',
            'TTL': '86400',
            'Authorization': authorization,
          },
          body: payload,
        });

        if (response.ok || response.status === 201) {
          console.log('Push sent successfully to:', sub.endpoint.slice(-20));
          successful++;
        } else {
          const errorText = await response.text();
          console.error('Push failed:', response.status, errorText);
          failed++;
          
          // Remove invalid subscriptions
          if (response.status === 410 || response.status === 404) {
            console.log('Removing invalid subscription:', sub.id);
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('id', sub.id);
          }
        }
      } catch (error) {
        console.error('Error sending push to:', sub.endpoint.slice(-20), error);
        failed++;
      }
    }

    console.log(`Push results: ${successful} successful, ${failed} failed`);

    return new Response(
      JSON.stringify({ 
        message: 'Push notifications sent',
        successful,
        failed,
        total: subscriptions.length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error in send-push-notification:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
