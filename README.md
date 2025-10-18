# escribo_gerador_de_plano

Gerador de planos usando escribo para persistir dados de geração do plano e comunicação com a api do google gemini.
Também foi utilizado flutter web para criaçãoo da interface de interação com o usuário.
Usuário, através da interface entra com os dados necessários para a geração do plano como série, disciplina, duração de horário, objetivos gerais. Defini esses critérios segundo a bncc:

titulo — título da aula

serie_ano — série/ano escolar (ex: "6º ano EF")

disciplina — (ex: Matemática, Ciências, Português)

tempo_estimado_min — duração em minutos da aula

nivel — (ex: iniciante/intermediário/avançado) ou faixa etária

objetivos_gerais — texto curto (1-2 frases) sobre objetivos do professor

recursos — lista/array (quais recursos serão usados: quadro, tablets, papel, etc.)

competencias_bncc — texto / código BNCC (ou permitir seleção de competências)

metodologia_preferida — (ex: aprendizagem baseada em projetos, jogos, discussões)

avaliacao_desejada — tipo de avaliação desejada (ex.: formativa, somativa)

lingua — idioma do plano (PT-BR)

Todas essas informações foram incluídas no script do banco, mas nos processos seguintes não são mostradas para simplificar e demonstrar a realização do teste.

Fora usado o modelo gemini flash 2.5, por ser otimizado para respostas rápidas, opções configuráveis para forçar o modelo de resposta como json.
Como estou usando o plano gratuito obtive problema com respostas muito grandes do modelo e truncamento da resposta válida como json, então forcei para que ele resumisse bastante o tamanho da resposta para que nao ultrapassasse a quantidade de tokens que posso gerar no nível gratuito.
O prompt usado é bastante simples, propositadamente, apenas para critério de exemplificação do trabalho, o prompt pode ser melhorado, bem como tornar maior e mais completa a resposta do gemini com um plano que suporte entregar mais tokens.


Para o front, foi usado o flutter web, que ja tem widgets prontos. Não houve foco em tornar a saída humanizada, printei apenas a resposta em um widget para demonstração e por falta de tempo para execução do trabalho completo.

Os planos gerados são salvos no banco do supabase.

Para utilizar o sistema, basta realizar a instalação do flutter e todas as dependências necessárias para o funcionamento dele, e em seguida rodar o projeto usando um navegador qualquer para depurar o código. A integração com o meu projeto supabase e gemini foi devidamente configurada, então o sistema deve estar funcional.

Os arquivos usados no supabase estão inseridos na pasta supabase_files: script do banco e código que atualmente roda na edge function que se conecta com o gemini.
