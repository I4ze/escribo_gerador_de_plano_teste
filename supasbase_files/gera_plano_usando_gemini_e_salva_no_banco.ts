import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Variáveis de ambiente
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

// Definição dos Headers de CORS (CRUCIAL para o Flutter Web/Navegador)
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*', // Permite qualquer origem acessar
  'Content-Type': 'application/json',
  // Necessário para o tratamento da requisição OPTIONS
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, apikey',
};

// Definição do esquema JSON para a resposta do Gemini (Obrigatório para Saída Estruturada)
const responseSchema = {
  type: 'OBJECT',
  properties: {
    introducao_ludica: {
      type: 'STRING',
      description: 'Uma descrição de uma introdução criativa e lúdica para o tema da aula.'
    },
    objetivo_bncc: {
      type: 'STRING',
      description: 'Um objetivo de aprendizagem específico e alinhado à BNCC para a aula.'
    },
    passo_a_passo: {
      type: 'ARRAY',
      description: 'Lista de etapas detalhadas para a condução da aula.',
      items: {
        type: 'STRING'
      }
    },
    avaliacao: {
      type: 'OBJECT',
      description: 'Critérios e rubrica para avaliação.',
      properties: {
        criterios: {
          type: 'ARRAY',
          description: 'Lista de critérios de avaliação claros.',
          items: {
            type: 'STRING'
          }
        },
        rubrica: {
          type: 'STRING',
          description: 'Descrição breve dos níveis de desempenho da avaliação.'
        }
      },
      required: [
        'criterios',
        'rubrica'
      ]
    }
  },
  required: [
    'introducao_ludica',
    'objetivo_bncc',
    'passo_a_passo',
    'avaliacao'
  ]
};

// Validação das variáveis de ambiente
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !GEMINI_API_KEY) {
  console.error('Variáveis de ambiente faltando: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY');
}
const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

Deno.serve(async (req) => {
  //
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204, // Status de sucesso sem conteúdo
      headers: CORS_HEADERS,
    });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({
        error: 'Method not allowed'
      }), {
        status: 405,
        headers: CORS_HEADERS, // Aplicando CORS
      });
    }

    const input = await req.json();

    if (!input.titulo || !input.serie_ano || !input.disciplina) {
      return new Response(JSON.stringify({
        error: 'Campos obrigatórios: titulo, serie_ano, disciplina'
      }), {
        status: 400,
        headers: CORS_HEADERS, // Aplicando CORS
      });
    }

    const prompt = buildPrompt(input);
    const modelName = 'gemini-2.5-flash-preview-09-2025';
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;

    const gReqBody = {
      systemInstruction: {
        parts: [
          {
            text: "Você é um especialista em planejamento pedagógico brasileiro (BNCC). Sua única tarefa é gerar um objeto JSON que represente o plano de aula, seguindo estritamente o esquema fornecido, e não deve incluir qualquer texto adicional, markdown, ou explicações fora do JSON."
          }
        ]
      },
      contents: [
        {
          parts: [
            {
              text: prompt
            }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        maxOutputTokens: 1500,
        temperature: 0.7
      }
    };

    console.log('Fazendo requisição para Gemini...');

    // NOTE: Não use console.log para GEMINI_API_KEY ou SUPABASE_SERVICE_ROLE_KEY
    const gResp = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(gReqBody)
    });

    const gJson = await gResp.json();

    // Salvar log no Supabase (melhorado com try/catch)
    try {
      await supabase.from('api_logs').insert([
        {
          user_id: null,
          endpoint: 'gemini-generate',
          request_body: gReqBody,
          response_body: gJson,
          status_code: gResp.status
        }
      ]);
    } catch (logError) {
      console.error('Erro ao salvar log:', logError);
    }

    // Verifica se a resposta da Gemini foi bem-sucedida (status 2xx)
    if (!gResp.ok) {
      console.error('Erro Gemini - Detalhes:', gJson);
      return new Response(JSON.stringify({
        error: 'Erro na API Gemini. Verifique Logs de Auth/Quota. Status: ' + gResp.status,
        details: gJson.error || gJson
      }), {
        status: 500,
        headers: CORS_HEADERS, // Aplicando CORS
      });
    }

    const generatedText = extractTextFromGeminiResponse(gJson);

    const feedback = gJson?.promptFeedback;
    if (feedback) {
      const blockReason = feedback.blockReason || 'GENERATION_ERROR';
      if (blockReason !== 'BLOCK_REASON_UNSPECIFIED') {
        console.error('Geração bloqueada/filtrada. Motivo:', blockReason, feedback.safetyRatings);
        return new Response(JSON.stringify({
          error: 'A geração da IA foi bloqueada ou filtrada.',
          reason: blockReason,
          details: feedback.safetyRatings || 'Nenhum'
        }), {
          status: 500,
          headers: CORS_HEADERS, // Aplicando CORS
        });
      }
    }

    if (!generatedText) {
      return new Response(JSON.stringify({
        error: 'Resposta vazia da Gemini. (Candidato/Parte Vazia)',
        details: gJson
      }), {
        status: 500,
        headers: CORS_HEADERS, // Aplicando CORS
      });
    }

    let planJson;

    try {
      // Tenta o parse normal (com .trim() já aplicado)
      const cleanText = generatedText.trim();
      planJson = JSON.parse(cleanText);
    } catch (err) {
      // Tenta corrigir JSON truncado por limite de tokens
      if (err.message.includes("Unterminated string in JSON")) {
        console.warn("Tentativa de RESGATE de JSON truncado (corte de token).");
        let cleanText = generatedText.trim();
        let lastCommaIndex = cleanText.lastIndexOf(',');
        if (lastCommaIndex !== -1) {
          cleanText = cleanText.substring(0, lastCommaIndex) + '}';
          try {
            planJson = JSON.parse(cleanText);
            console.log("Resgate do JSON bem-sucedido.");
          } catch (rescueErr) {
            console.error('Falha no resgate:', rescueErr.message);
          }
        }
      }

      if (!planJson) {
        console.error('Erro no parse JSON:', err);
        return new Response(JSON.stringify({
          error: 'Resposta da IA não foi JSON válido. Falha no parse.',
          raw: generatedText,
          details: err.message
        }), {
          status: 500,
          headers: CORS_HEADERS, // Aplicando CORS
        });
      }
    }

    // Salvar no banco de dados
    const { data, error } = await supabase.from('lesson_plans').insert([
      {
        user_id: null,
        titulo: input.titulo,
        serie_ano: input.serie_ano,
        disciplina: input.disciplina,
        tempo_estimado_min: input.tempo_estimado_min,
        nivel: input.nivel,
        objetivos_gerais: (input.objetivos || []).join(' | '),
        recursos: input.recursos || [],
        competencias_bncc: input.competencias_bncc || {},
        input_snapshot: input,
        plan_json: planJson,
        rubric_json: planJson.avaliacao || null,
        status: 'generated'
      }
    ]).select();

    if (error) {
      console.error('Erro Supabase:', error);
      // Se houver um erro do Supabase, o erro é jogado para o catch(err) geral
      throw error;
    }

    // Resposta de Sucesso
    return new Response(JSON.stringify({
      ok: true,
      plan: planJson,
      saved: data![0]
    }), {
      status: 200,
      headers: CORS_HEADERS, // Aplicando CORS
    });
  } catch (err) {
    console.error('Erro geral:', err);
    return new Response(JSON.stringify({
      error: (err as Error).message || String(err)
    }), {
      status: 500,
      headers: CORS_HEADERS, // Aplicando CORS
    });
  }
});

function buildPrompt(input: any) {
  // Simplificando JSON.stringify para evitar formatação excessiva no prompt
  return `Você é um assistente pedagógico especializado em BNCC.
  Gere um plano de aula **MUITO CONCISO E RESUMIDO** para o professor, seguindo a estrutura JSON estritamente definida.

  DETALHES DA AULA:
  ${JSON.stringify(input)}
  `;
}

function extractTextFromGeminiResponse(gJson: any) {
  return gJson?.candidates?.[0]?.content?.parts?.[0]?.text || '';
}
