-- Adicionar novos departamentos ao enum department_type
ALTER TYPE department_type ADD VALUE IF NOT EXISTS 'patrimonio';
ALTER TYPE department_type ADD VALUE IF NOT EXISTS 'tesouraria';