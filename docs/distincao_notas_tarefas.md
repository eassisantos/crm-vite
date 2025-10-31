# Distinção entre Notas/Andamentos e Tarefas

No contexto do CRM Jurídico AI, "Notas/Andamentos" e "Tarefas" são duas funcionalidades distintas, mas complementares, projetadas para otimizar a gestão de um caso. Entender a função de cada uma é crucial para um fluxo de trabalho eficiente.

## Tarefas (Tasks)

**Função Prática:** Representam **ações futuras e itens pendentes** que precisam ser executados para o progresso do caso. São o "to-do list" do processo.

- **Características Principais:**
    - **Acionáveis:** Cada tarefa é uma instrução clara do que precisa ser feito (ex: "Juntar novo laudo médico").
    - **Prazo Definido:** Possuem uma `dueDate` (data de vencimento), essencial para o controle de prazos processuais e administrativos.
    - **Estado Binário:** Têm um status claro de `completed` (concluída) ou pendente. O objetivo é mover todas as tarefas para o estado "concluída".
    - **Alertas:** O sistema utiliza as datas de vencimento para gerar notificações e alertas de prazos urgentes.

**Em resumo:** Tarefas são o **"O que fazer a seguir?"**.

## Notas/Andamentos (Notes/Progress)

**Função Prática:** Funcionam como um **diário de bordo ou um histórico cronológico** do caso. Elas registram tudo o que aconteceu, foi observado ou comunicado.

- **Características Principais:**
    - **Descritivas:** Registram eventos, conversas com clientes, decisões, insights, e o progresso geral do caso (ex: "Cliente informou que recebeu a carta de exigência do INSS em 20/07/2024.").
    - **Timestamped:** Cada nota é associada a uma data, criando uma linha do tempo clara dos acontecimentos.
    - **Fonte de Informação:** Servem como a "memória" do caso. São a base para análises e para a criação de novas tarefas.
    - **Integração com IA:** O conteúdo das notas é utilizado pelo assistente de IA para gerar resumos automáticos do caso e para sugerir novas tarefas relevantes.

**Em resumo:** Notas são o **"O que aconteceu até agora?"**.

## Como se Complementam

O fluxo de trabalho ideal utiliza as duas funcionalidades em conjunto:

1.  Um evento ocorre (ex: uma nova decisão é publicada, uma conversa com o cliente).
2.  Você registra esse evento na seção de **Notas/Andamentos** para manter o histórico completo e contextualizado.
3.  Com base nessa nova informação, você (ou a IA) cria uma ou mais **Tarefas** acionáveis com prazos definidos (ex: "Elaborar recurso da decisão", "Comunicar cliente sobre a publicação").

Dessa forma, as **Notas** fornecem o contexto e o histórico, enquanto as **Tarefas** garantem que as ações necessárias sejam executadas e monitoradas de forma organizada.
