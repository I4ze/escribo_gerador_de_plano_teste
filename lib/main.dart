import 'package:escribo_gerador_de_plano/screens/lesson_plan_generator.dart';
import 'package:flutter/material.dart';

void main() {
  runApp(const MainApp());
}

class MainApp extends StatelessWidget {
  const MainApp({super.key});

  @override
  Widget build(BuildContext context) {
    return LessonPlanGeneratorApp();
  }
}
