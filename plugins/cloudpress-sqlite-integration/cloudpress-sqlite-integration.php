<?php
/**
 * Plugin Name: CloudPress SQLite Integration
 * Description: CloudPress-managed SQLite/Durable Object integration bootstrap for php-wasm WordPress sites.
 * Version: 0.1.0
 * Author: CloudPress
 * Requires PHP: 8.0
 */

if (!defined('ABSPATH')) {
    exit;
}

final class CloudPress_SQLite_Integration {
    public static function boot(): void {
        add_action('plugins_loaded', [__CLASS__, 'define_runtime_flags']);
        add_filter('pre_option_db_version', [__CLASS__, 'db_version']);
        add_action('admin_notices', [__CLASS__, 'admin_notice']);
    }

    public static function define_runtime_flags(): void {
        if (!defined('CLOUDPRESS_SQLITE_INTEGRATION')) {
            define('CLOUDPRESS_SQLITE_INTEGRATION', true);
        }
        if (!defined('CLOUDPRESS_SQLITE_SHARD_PREFIX')) {
            define('CLOUDPRESS_SQLITE_SHARD_PREFIX', 'database');
        }
    }

    public static function db_version($value) {
        return $value ?: 'cloudpress-sqlite';
    }

    public static function admin_notice(): void {
        if (!current_user_can('manage_options')) {
            return;
        }
        echo '<div class="notice notice-info"><p>CloudPress SQLite Integration is active. WordPress is using the CloudPress php-wasm SQLite shard layer.</p></div>';
    }
}

CloudPress_SQLite_Integration::boot();
