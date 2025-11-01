# Guia de Deploy (Cloudflare + Neon)

## Pré-requisitos
- Node.js 18+
- Conta na Cloudflare com acesso ao Pages e Workers
- Instalação do Wrangler (`npm install -g wrangler`)
- Conta no Neon com uma instância PostgreSQL
- Bucket R2 configurado para armazenar documentos
- Chave de API válida da OpenAI ou Google AI (Gemini)

## Instalação local
```bash
npm install
npm run dev
```

Para executar apenas o Worker em modo de desenvolvimento:
```bash
npm run worker:dev
```

## Configuração do Vite
Crie um arquivo `.env.local` com a URL do Worker (usado em desenvolvimento local):
```bash
VITE_API_BASE_URL=http://127.0.0.1:8787
VITE_WORKER_UPLOAD_LIMIT_MB=15
```

Em produção (Cloudflare Pages), defina a variável `VITE_API_BASE_URL` apontando para o domínio público do Worker.

## Configuração do Neon
1. Crie um banco de dados e gere uma string de conexão (por exemplo, `postgresql://user:pass@host/db`).
2. Execute o SQL abaixo **apenas uma vez** para criar a tabela de estado compartilhado:
   ```sql
   CREATE TABLE IF NOT EXISTS app_state (
     scope TEXT PRIMARY KEY,
     payload JSONB NOT NULL,
     updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
   );
   ```
3. Nenhum outro esquema é necessário. O Worker armazena e lê os dados do CRM nesta tabela utilizando JSONB.

No `wrangler.toml` (veja seção a seguir) defina `NEON_DATABASE_URL` com a connection string do banco.

## Configuração do Worker (`wrangler.toml`)
```toml
name = "crm-worker"
main = "worker/src/index.ts"
compatibility_date = "2024-07-29"
node_compat = true

[vars]
NEON_DATABASE_URL = "postgresql://..."  # string de conexão do Neon
AI_PROVIDER = "openai"                  # ou "google"
OPENAI_MODEL = "gpt-4o-mini"            # opcional
GOOGLE_AI_MODEL = "gemini-1.5-flash"    # opcional
R2_PUBLIC_BASE_URL = "https://<account>.r2.cloudflarestorage.com/crm-files"

[[r2_buckets]]
binding = "FILES_BUCKET"
bucket_name = "crm-files"
preview_bucket_name = "crm-files-dev"
```

> ⚠️ `OPENAI_API_KEY` ou `GOOGLE_AI_API_KEY` devem ser configuradas como **variáveis secretas** via `wrangler secret put`.

### Executando localmente
```bash
wrangler dev --local
```

## Deploy do Worker
```bash
npm run worker:deploy
```

## Deploy do Frontend
1. Configure um projeto Cloudflare Pages apontando para este repositório.
2. Defina as variáveis de ambiente do build (`VITE_API_BASE_URL`, `VITE_WORKER_UPLOAD_LIMIT_MB`).
3. Execute o build padrão (`npm install && npm run build`).

## Ajustes adicionais
- Atualize `R2_PUBLIC_BASE_URL` caso utilize um domínio personalizado ou rota Signed URL.
- Os dados iniciais (clientes, casos, configurações) são carregados automaticamente a partir do Worker usando os mocks presentes em `shared/mockData.ts`.
- Para reiniciar os dados, utilize o menu de reset dentro da aplicação (que aciona o Worker).
