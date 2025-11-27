import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { notification_id, user_id } = await req.json();

    if (!notification_id || !user_id) {
      throw new Error('notification_id and user_id are required');
    }

    console.log('Sending push notification for:', { notification_id, user_id });

    // Buscar a notificação
    const { data: notification, error: notifError } = await supabase
      .from('notifications')
      .select('title, message')
      .eq('id', notification_id)
      .single();

    if (notifError || !notification) {
      throw new Error('Notification not found');
    }

    // Buscar todas as subscriptions do usuário
    const { data: subscriptions, error: subsError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', user_id);

    if (subsError) {
      throw new Error('Error fetching subscriptions');
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No push subscriptions found for user:', user_id);
      return new Response(
        JSON.stringify({ message: 'No subscriptions found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // NOTA: A implementação completa de web-push requer VAPID keys
    // e a biblioteca web-push. Por enquanto, retornamos sucesso
    // para que a estrutura esteja pronta.
    
    console.log(`Would send push to ${subscriptions.length} devices`);
    
    // TODO: Implementar envio real com web-push quando VAPID keys estiverem configuradas
    // import webpush from 'npm:web-push';
    // webpush.setVapidDetails(...)
    // await webpush.sendNotification(subscription, payload)

    return new Response(
      JSON.stringify({ 
        message: 'Push notifications structure ready',
        subscriptions: subscriptions.length 
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
