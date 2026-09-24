import 'package:flutter/material.dart';

class ShellTopAppBar extends StatelessWidget implements PreferredSizeWidget {
  const ShellTopAppBar({super.key});

  @override
  Size get preferredSize => const Size.fromHeight(56.0);

  @override
  Widget build(BuildContext context) {
    return AppBar(
      title: Row(
        children: [
          const Text('登科', style: TextStyle(fontWeight: FontWeight.bold)),
          const SizedBox(width: 24),
          const Icon(Icons.school_outlined, size: 20),
          const SizedBox(width: 8),
          Text(
            '浙江大学 · 计算机 (085404)',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(width: 24),
          const Icon(Icons.timer_outlined, size: 20),
          const SizedBox(width: 8),
          Text(
            '距考研 98 天',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
        ],
      ),
      actions: [
        Padding(
          padding: const EdgeInsets.only(right: 16.0),
          child: CircleAvatar(
            radius: 16,
            backgroundColor: Theme.of(context).colorScheme.primaryContainer,
            child: const Icon(Icons.person_outline, size: 20),
          ),
        ),
      ],
      elevation: 0,
      scrolledUnderElevation: 0,
    );
  }
}
