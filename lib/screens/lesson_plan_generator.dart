import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

void main() {
  runApp(const LessonPlanGeneratorApp());
}

class LessonPlanGeneratorApp extends StatelessWidget {
  const LessonPlanGeneratorApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Gerador de Plano de Aula - Gemini/Supabase',
      theme: ThemeData(primarySwatch: Colors.indigo, useMaterial3: true),
      home: const LessonPlanForm(),
    );
  }
}

class LessonPlanForm extends StatefulWidget {
  const LessonPlanForm({super.key});

  @override
  State<LessonPlanForm> createState() => _LessonPlanFormState();
}

class _LessonPlanFormState extends State<LessonPlanForm> {
  final _formKey = GlobalKey<FormState>();

  // Chave pública 'anon' do projeto Supabase.
  final String _supabaseAnonKey =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdnemluaGR3bm1zcmlmZ2h2Z2R0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3NjAyNTYsImV4cCI6MjA3NjMzNjI1Nn0.yK0Dk89a7XIAdYguQtqh3o3v3eCTKbdNJ8MZ7KFKkFI';

  final String _supabaseFunctionUrl =
      'https://ggzinhdwnmsrifghvgdt.supabase.co/functions/v1/grava_no_banco_e_retorna_plano';

  final TextEditingController _tituloController = TextEditingController();
  final TextEditingController _serieAnoController = TextEditingController();
  final TextEditingController _disciplinaController = TextEditingController();

  final TextEditingController _tempoController = TextEditingController(
    text: '50',
  );
  final TextEditingController _nivelController = TextEditingController(
    text: 'Ensino Fundamental',
  );

  bool _isLoading = false;
  String _responseText = 'Aguardando submissão do formulário...';

  String? _requiredValidator(String? value) {
    if (value == null || value.isEmpty) {
      return 'Este campo é obrigatório';
    }
    return null;
  }

  // Função que faz a requisição POST para o Supabase
  Future<void> _submitForm() async {
    if (_formKey.currentState!.validate()) {
      setState(() {
        _isLoading = true;
        _responseText = 'Enviando requisição para a IA...';
      });

      // Monta o payload (corpo da requisição)
      final body = {
        'titulo': _tituloController.text.trim(),
        'serie_ano': _serieAnoController.text.trim(),
        'disciplina': _disciplinaController.text.trim(),
        'tempo_estimado_min': int.tryParse(_tempoController.text) ?? 50,
        'nivel': _nivelController.text.trim(),
        'objetivos': ['Gerar plano de aula em português'],
        'recursos': ['Computador', 'Acesso à internet'],
        'competencias_bncc': {},
      };

      try {
        final response = await http.post(
          Uri.parse(_supabaseFunctionUrl),
          headers: {
            'Content-Type': 'application/json',
            // ✅ CORREÇÃO: Usando o header padrão de autorização JWT
            'Authorization': 'Bearer $_supabaseAnonKey',
          },
          body: json.encode(body),
        );

        if (response.statusCode == 200) {
          final formattedJson = const JsonEncoder.withIndent(
            '  ',
          ).convert(json.decode(response.body));
          setState(() {
            _responseText = formattedJson;
          });
        } else {
          setState(() {
            _responseText =
                'Erro: Status ${response.statusCode}\nCorpo da Resposta:\n${response.body}';
          });
        }
      } catch (e) {
        setState(() {
          _responseText = 'Erro de Conexão ou Parse:\n$e';
        });
      } finally {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  void dispose() {
    _tituloController.dispose();
    _serieAnoController.dispose();
    _disciplinaController.dispose();
    _tempoController.dispose();
    _nivelController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Gerador de Plano de Aula IA'),
        backgroundColor: Theme.of(context).colorScheme.primary,
        foregroundColor: Colors.white,
      ),
      body: Row(
        children: [
          Expanded(
            flex: 1,
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24.0),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: <Widget>[
                    const Text(
                      'Detalhes da Aula',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Campo Título
                    TextFormField(
                      controller: _tituloController,
                      decoration: const InputDecoration(
                        labelText: 'Título da Aula*',
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.all(Radius.circular(8)),
                        ),
                        hintText: 'Ex: Resolução de Problemas com Frações',
                      ),
                      validator: _requiredValidator,
                    ),
                    const SizedBox(height: 12),

                    // Campo Série/Ano
                    TextFormField(
                      controller: _serieAnoController,
                      decoration: const InputDecoration(
                        labelText: 'Série/Ano*',
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.all(Radius.circular(8)),
                        ),
                        hintText: 'Ex: 5º Ano do Ensino Fundamental',
                      ),
                      validator: _requiredValidator,
                    ),
                    const SizedBox(height: 12),

                    // Campo Disciplina
                    TextFormField(
                      controller: _disciplinaController,
                      decoration: const InputDecoration(
                        labelText: 'Disciplina*',
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.all(Radius.circular(8)),
                        ),
                        hintText: 'Ex: Matemática',
                      ),
                      validator: _requiredValidator,
                    ),
                    const SizedBox(height: 12),

                    // Campo Tempo (Opcional, mas necessário para o payload)
                    TextFormField(
                      controller: _tempoController,
                      decoration: const InputDecoration(
                        labelText: 'Tempo Estimado (min)',
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.all(Radius.circular(8)),
                        ),
                        hintText: '50',
                      ),
                      keyboardType: TextInputType.number,
                    ),
                    const SizedBox(height: 12),

                    // Campo Nível (Opcional, mas necessário para o payload)
                    TextFormField(
                      controller: _nivelController,
                      decoration: const InputDecoration(
                        labelText: 'Nível Educacional',
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.all(Radius.circular(8)),
                        ),
                        hintText: 'Ex: Ensino Fundamental',
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Botão de Submissão
                    ElevatedButton.icon(
                      onPressed: _isLoading ? null : _submitForm,
                      icon: _isLoading
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Icon(Icons.auto_stories),
                      label: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 12.0),
                        child: Text(
                          _isLoading ? 'Gerando...' : 'Gerar Plano de Aula',
                        ),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor:
                            Theme.of(context).colorScheme.secondary,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),

          // Separador (Linha vertical)
          const VerticalDivider(width: 1, thickness: 1),

          // Coluna de Resposta (Ocupa 2/3 da tela em telas maiores)
          Expanded(
            flex: 2,
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Resposta da Função Supabase (JSON Bruto)',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 16),

                  // Widget para exibir a resposta (usando um Card para destacar)
                  Card(
                    elevation: 4,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(16.0),
                      decoration: BoxDecoration(
                        color: Colors.grey[100],
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.indigo.shade100),
                      ),
                      child: SelectableText(
                        _responseText,
                        style: TextStyle(
                          fontFamily: 'monospace',
                          color: Colors.grey[800],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
