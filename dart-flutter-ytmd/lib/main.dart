import 'dart:io';

import 'package:flutter/services.dart';
import 'package:path_provider/path_provider.dart';
import 'package:ytmd/app.dart';
import 'package:flutter/material.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  final documents = await getApplicationDocumentsDirectory();

  if (await File("${documents.path}/iframe.js").exists()) {
    await File("${documents.path}/iframe.js").delete();
  }

  if (await File("${documents.path}/player.js").exists()) {
    await File("${documents.path}/player.js").delete();
  }

  final bytes = await rootBundle.load("bin/ytmd").then((b) => b.buffer.asUint8List());
  final file = File("${documents.path}/ytmd");
  await file.writeAsBytes(bytes);
  await Process.run("chmod", ["755", file.path]);

  final process1 = await Process.run(file.path, ["api.getInfo('v7bnOxV4jAc')"]);
  print("stdout1: " + process1.stdout);
  print("stderr1: " + process1.stderr);

  final process2 = await Process.run(file.path, ["api.getInfo('v7bnOxV4jAc')"]);
  print("stdout2: " + process2.stdout);
  print("stderr2: " + process2.stderr);

  runApp(const App());
}
