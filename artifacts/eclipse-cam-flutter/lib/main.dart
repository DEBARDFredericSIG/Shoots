import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'providers/app_state.dart';
import 'screens/controller_screen.dart';
import 'screens/history_screen.dart';
import 'screens/sequences_screen.dart';
import 'theme/app_colors.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);
  SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.light,
    systemNavigationBarColor: Colors.transparent,
    systemNavigationBarIconBrightness: Brightness.light,
  ));
  runApp(const EclipseCamApp());
}

class EclipseCamApp extends StatelessWidget {
  const EclipseCamApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => AppState(),
      child: MaterialApp(
        title: 'Eclipse Cam',
        debugShowCheckedModeBanner: false,
        theme: _buildDarkTheme(),
        home: const _MainNavigation(),
      ),
    );
  }

  ThemeData _buildDarkTheme() {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: AppColors.background,
      colorScheme: const ColorScheme.dark(
        surface: AppColors.card,
        primary: AppColors.primary,
        secondary: AppColors.accent,
        error: AppColors.destructive,
        onSurface: AppColors.foreground,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.background,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        iconTheme: IconThemeData(color: AppColors.foreground),
        titleTextStyle: TextStyle(
          color: AppColors.foreground,
          fontSize: 18,
          fontWeight: FontWeight.w700,
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: AppColors.secondary,
        indicatorColor: AppColors.primary.withOpacity(0.15),
        iconTheme: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return const IconThemeData(color: AppColors.primary, size: 22);
          }
          return const IconThemeData(color: AppColors.mutedForeground, size: 22);
        }),
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return const TextStyle(
              color: AppColors.primary,
              fontSize: 11,
              fontWeight: FontWeight.w700,
            );
          }
          return const TextStyle(
            color: AppColors.mutedForeground,
            fontSize: 11,
          );
        }),
      ),
      textTheme: const TextTheme(
        bodyLarge: TextStyle(color: AppColors.foreground),
        bodyMedium: TextStyle(color: AppColors.foreground),
        bodySmall: TextStyle(color: AppColors.mutedForeground),
      ),
      dividerTheme: const DividerThemeData(color: AppColors.border),
      dialogTheme: DialogThemeData(
        backgroundColor: AppColors.card,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: AppColors.secondary,
        contentTextStyle: const TextStyle(color: AppColors.foreground),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }
}

// ── Navigation principale ────────────────────────────────────────────────────

class _MainNavigation extends StatefulWidget {
  const _MainNavigation();

  @override
  State<_MainNavigation> createState() => _MainNavigationState();
}

class _MainNavigationState extends State<_MainNavigation> {
  int _index = 0;

  static const _tabs = [
    ControllerScreen(),
    SequencesScreen(),
    HistoryScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    final insets = MediaQuery.of(context).padding;

    return Scaffold(
      body: IndexedStack(index: _index, children: _tabs),
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          border: Border(top: BorderSide(color: AppColors.border)),
        ),
        child: NavigationBar(
          selectedIndex: _index,
          onDestinationSelected: (i) => setState(() => _index = i),
          destinations: const [
            NavigationDestination(
              icon: Icon(Icons.camera_alt_outlined),
              selectedIcon: Icon(Icons.camera_alt),
              label: 'Contrôleur',
            ),
            NavigationDestination(
              icon: Icon(Icons.list_outlined),
              selectedIcon: Icon(Icons.list),
              label: 'Séquences',
            ),
            NavigationDestination(
              icon: Icon(Icons.history_outlined),
              selectedIcon: Icon(Icons.history),
              label: 'Historique',
            ),
          ],
        ),
      ),
    );
  }
}
