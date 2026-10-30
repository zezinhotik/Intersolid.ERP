# Portal Intersolid ERP com Supabase: passo a passo

O Supabase guarda os cadastros, a senha de cada pessoa e a apresentação protegida. O site (as telas de login) fica hospedado no Netlify, que é gratuito e funciona arrastando a pasta.

| Item do pacote | Para que serve |
|---|---|
| `setup.sql` | Cria as tabelas, as regras de segurança e a pasta privada no Supabase |
| `public/` | O site: login, cadastro, espera e painel de acessos. É esta pasta que vai para o Netlify |
| `public/index.html` | O portal inteiro num arquivo só. No topo dele você cola o endereço e a chave do Supabase |
| `apresentacao/Intersolid_ERP_Apresentacao_Marca.html` | A apresentação. **Não** vai para o Netlify: você publica pelo portal no primeiro acesso |

---

## Parte 1 · Supabase

### 1. Rodar o script do banco
1. Abra o arquivo `setup.sql` num editor de texto e troque `SEU-EMAIL@intersolid.com.br` pelo seu e-mail (linha marcada com `<<< SEU E-MAIL`).
2. No Supabase, abra o projeto e clique em **SQL Editor** no menu da esquerda.
3. Clique em **New query**, cole todo o conteúdo do arquivo e clique em **Run**.
4. Deve aparecer **Success. No rows returned**. Em **Table Editor** passam a existir as tabelas `profiles`, `versions`, `logs` e `admin_emails`, e em **Storage** a pasta `apresentacao`.

### 2. Ajustar o login por e-mail
1. Vá em **Authentication › Sign In / Providers** e abra **Email**.
2. Deixe **Enable Email provider** ligado.
3. **Desligue "Confirm email"** e salve.

Por quê: o servidor de e-mail que vem com o Supabase só envia mensagens para os membros da sua equipe no Supabase, e no máximo 2 por hora. Com a confirmação ligada, os vendedores nunca receberiam o link. A segurança continua garantida porque ninguém vê nada antes de você aprovar.

### 3. Copiar o endereço e a chave
1. Clique em **Connect** no topo do projeto, ou vá em **Project Settings › API Keys**.
2. Copie a **Project URL** (algo como `https://abcdxyz.supabase.co`).
3. Copie a chave **anon** ou **publishable**.
   **Nunca use a chave `service_role` ou `secret`.** Ela dá acesso total ao banco.
4. Abra `public/index.html` e cole os dois valores em `SUPABASE_URL` e `SUPABASE_KEY`, no bloco de configuração do topo do arquivo.

---

## Parte 2 · Colocar o site no ar (Netlify)

1. Crie uma conta gratuita em **netlify.com** (pode entrar com a conta Google).
2. No painel, clique em **Add new site › Deploy manually**.
3. Arraste a pasta **`public`** (só ela) para a área indicada.
4. Em alguns segundos o Netlify mostra o endereço do site, algo como `https://nome-aleatorio.netlify.app`. Em **Site configuration › Change site name** você pode trocar para algo como `intersolid-apresentacao`.

### Avisar o Supabase sobre o endereço
1. No Supabase, vá em **Authentication › URL Configuration**.
2. Em **Site URL**, cole o endereço do Netlify.
3. Em **Redirect URLs**, clique em **Add URL** e cole o mesmo endereço.
4. Salve.

---

## Parte 3 · Primeiro acesso

1. Abra o endereço do site.
2. Clique em **Criar cadastro** e use **o mesmo e-mail** que colocou no `setup.sql`. Esse cadastro já nasce aprovado e como administrador.
3. O portal pede o arquivo da apresentação. Escolha `apresentacao/Intersolid_ERP_Apresentacao_Marca.html`.
4. A apresentação abre. Envie o endereço do site aos vendedores.

---

## No dia a dia

**Aprovar cadastros.** Clique no seu nome no canto superior direito da apresentação e em **Gerenciar acessos**. O número laranja mostra quantos pedidos estão aguardando. Quem é aprovado vê a apresentação abrir sozinha em até 10 segundos.

**Revogar.** Na aba **Liberados**, use **Revogar acesso**. A apresentação fecha para a pessoa em até 10 segundos.

**Atualizar conteúdo.** Clique em **ADM** na tela inicial da apresentação, cadastre o conteúdo (texto, PDF, imagem) e clique em **Publicar para todos**.

**Ver quem usou.** Aba **Acessos recentes**.

**Excluir de vez uma conta.** No Supabase, **Authentication › Users**, clique nos três pontinhos da pessoa e em **Delete user**. O cadastro some junto.

**Atualizar o site** (só se eu te mandar uma versão nova do portal). No Netlify, abra o site, aba **Deploys**, e arraste a nova pasta `public`.

---

## Opcional · "Esqueci minha senha" para os vendedores

Sem um servidor de e-mail próprio, o link de redefinição de senha só chega para você. Para os vendedores receberem:

1. Crie uma conta gratuita num serviço de envio, como o **Brevo** (brevo.com).
2. No Brevo, em **SMTP & API › SMTP**, gere uma **chave SMTP**.
3. No Supabase, vá em **Authentication › Emails › SMTP Settings**, ligue **Enable custom SMTP** e preencha: host `smtp-relay.brevo.com`, porta `587`, usuário e senha (a chave SMTP) que o Brevo mostra, e o e-mail remetente.
4. Depois disso você pode, se quiser, voltar a ligar o **Confirm email**.

Enquanto isso não for feito, se um vendedor esquecer a senha: exclua a conta dele no Supabase (passo acima) e peça para ele se cadastrar de novo.

## Opcional · Entrar com Google

Exige criar uma credencial no Google Cloud. Se quiser, me chame e eu te guio. Depois de configurado em **Authentication › Sign In / Providers › Google**, troque `ENABLE_GOOGLE: false` para `true` no topo do `index.html` e envie a pasta `public` de novo ao Netlify.

---

## Problemas comuns

| O que aparece | O que fazer |
|---|---|
| "Cadastro não encontrado" | O `setup.sql` não foi executado, ou foi executado depois de você se cadastrar. Rode o script de novo: ele corrige |
| Seu cadastro ficou "em análise" em vez de admin | O e-mail no `setup.sql` está diferente do usado no cadastro. Corrija e rode o script de novo |
| "Sem permissão para essa ação" ao publicar | Mesmo motivo acima |
| "Confirme seu e-mail antes de entrar" | O "Confirm email" ainda está ligado (Parte 1, passo 2) |
| "O envio de e-mails ainda não está configurado" | Normal sem SMTP próprio. Veja a parte opcional acima |
| O site abre, mas não entra ninguém | Confira a Project URL e a chave no topo do `index.html` (ou use o link **Diagnóstico** na tela de login), e envie a pasta `public` de novo |
| O microfone não funciona | Use Chrome ou Edge e permita o microfone no cadeado da barra de endereço |
