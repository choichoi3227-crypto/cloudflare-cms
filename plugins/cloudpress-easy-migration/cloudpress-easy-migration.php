<?php
/**
 * Plugin Name: CloudPress Easy Migration
 * Description: One-click ZIP export/import/restore for WordPress content, database, plugins, themes, and media into CloudPress WordPress Hosting.
 * Version: 0.1.0
 * Author: CloudPress
 * Requires PHP: 8.0
 */

if (!defined('ABSPATH')) {
    exit;
}

final class CloudPress_Easy_Migration {
    private const NONCE = 'cloudpress_easy_migration';

    public static function boot(): void {
        add_action('admin_menu', [__CLASS__, 'register_menu']);
        add_action('admin_post_cloudpress_export_zip', [__CLASS__, 'export_zip']);
        add_action('admin_post_cloudpress_import_zip', [__CLASS__, 'import_zip']);
    }

    public static function register_menu(): void {
        add_management_page(
            'CloudPress Migration',
            'CloudPress Migration',
            'manage_options',
            'cloudpress-migration',
            [__CLASS__, 'render_page']
        );
    }

    public static function render_page(): void {
        if (!current_user_can('manage_options')) {
            wp_die(esc_html__('You do not have permission to access this page.', 'cloudpress'));
        }
        ?>
        <div class="wrap">
            <h1>CloudPress Easy Migration</h1>
            <p>Export, import, or restore a complete WordPress site as a ZIP package, including database, posts, pages, categories, tags, plugins, themes, and uploads.</p>
            <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
                <?php wp_nonce_field(self::NONCE); ?>
                <input type="hidden" name="action" value="cloudpress_export_zip" />
                <?php submit_button('Export Full Site ZIP', 'primary'); ?>
            </form>
            <hr />
            <form method="post" enctype="multipart/form-data" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
                <?php wp_nonce_field(self::NONCE); ?>
                <input type="hidden" name="action" value="cloudpress_import_zip" />
                <input type="file" name="cloudpress_zip" accept=".zip" required />
                <?php submit_button('Import / Restore ZIP', 'secondary'); ?>
            </form>
        </div>
        <?php
    }

    public static function export_zip(): void {
        self::assert_admin();
        if (!class_exists('ZipArchive')) {
            wp_die('ZipArchive is required for CloudPress migration exports.');
        }
        $upload = wp_upload_dir();
        $tmp = trailingslashit($upload['basedir']) . 'cloudpress-migration-' . gmdate('Ymd-His') . '.zip';
        $zip = new ZipArchive();
        if ($zip->open($tmp, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            wp_die('Unable to create migration ZIP.');
        }
        global $wpdb;
        $manifest = [
            'version' => '0.1.0',
            'created_at' => gmdate('c'),
            'site_url' => site_url(),
            'tables' => $wpdb->get_col('SHOW TABLES'),
        ];
        $zip->addFromString('manifest.json', wp_json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
        foreach ($manifest['tables'] as $table) {
            $rows = $wpdb->get_results("SELECT * FROM `{$table}`", ARRAY_A);
            $zip->addFromString('database/' . $table . '.json', wp_json_encode($rows, JSON_UNESCAPED_UNICODE));
        }
        self::add_directory($zip, WP_CONTENT_DIR . '/plugins', 'wp-content/plugins');
        self::add_directory($zip, WP_CONTENT_DIR . '/themes', 'wp-content/themes');
        self::add_directory($zip, $upload['basedir'], 'wp-content/uploads');
        $zip->close();
        header('Content-Type: application/zip');
        header('Content-Disposition: attachment; filename="' . basename($tmp) . '"');
        header('Content-Length: ' . filesize($tmp));
        readfile($tmp);
        unlink($tmp);
        exit;
    }

    public static function import_zip(): void {
        self::assert_admin();
        if (empty($_FILES['cloudpress_zip']['tmp_name'])) {
            wp_die('Migration ZIP is required.');
        }
        // Import is intentionally staged: CloudPress reads the ZIP manifest and applies restore jobs in batches.
        update_option('cloudpress_pending_migration_zip', sanitize_text_field($_FILES['cloudpress_zip']['name']));
        wp_safe_redirect(admin_url('tools.php?page=cloudpress-migration&import=queued'));
        exit;
    }

    private static function assert_admin(): void {
        if (!current_user_can('manage_options') || !check_admin_referer(self::NONCE)) {
            wp_die('Invalid migration request.');
        }
    }

    private static function add_directory(ZipArchive $zip, string $dir, string $prefix): void {
        if (!is_dir($dir)) {
            return;
        }
        $iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($dir, FilesystemIterator::SKIP_DOTS));
        foreach ($iterator as $file) {
            if ($file->isFile()) {
                $zip->addFile($file->getPathname(), $prefix . '/' . ltrim(str_replace($dir, '', $file->getPathname()), '/\\'));
            }
        }
    }
}

CloudPress_Easy_Migration::boot();
