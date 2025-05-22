(function () {
    'use strict';

    var list_opened = false;
    var current_path = '';
    var path_history = [];

    function getFolderStructure(files) {
        var structure = {};

        files.forEach(function(file) {
            var path = file.path || file.name;
            var parts = path.split('/');
            var current = structure;

            for (var i = 0; i < parts.length - 1; i++) {
                var part = parts[i];
                if (!current[part]) {
                    current[part] = {};
                }
                current = current[part];
            }
        });

        return structure;
    }

    function renderBreadcrumbs(path) {
        var parts = path.split('/').filter(Boolean);
        var html = '<div class="torrent-path-navigation">';
        
        html += '<div class="path-item" data-path="">Root</div>';
        
        var currentPath = '';
        parts.forEach(function(part, index) {
            currentPath += part + '/';
            html += '<div class="path-separator">></div>';
            html += '<div class="path-item" data-path="' + currentPath + '">' + part + '</div>';
        });
        
        html += '</div>';
        
        return html;
    }

    function renderFolderList(structure, current_path) {
        var html = '<div class="torrent-folder-list">';
        var current = structure;
        var path_parts = current_path ? current_path.split('/').filter(Boolean) : [];
        
        path_parts.forEach(function(part) {
            current = current[part];
        });
        
        Object.keys(current).forEach(function(key) {
            if (typeof current[key] === 'object') {
                html += '<div class="folder-item selector" data-path="' + (current_path + key + '/') + '">';
                html += '<div class="folder-icon"></div>';
                html += '<div class="folder-name">' + key + '</div>';
                html += '</div>';
            }
        });
        
        html += '</div>';
        
        return html;
    }

    function filterFilesByPath(files, path) {
        return files.filter(function(file) {
            var file_path = file.path || file.name;
            return file_path.startsWith(path) && 
                   file_path.replace(path, '').split('/').length === 1;
        });
    }

    function updateFileList(data, path) {
        var filtered_files = filterFilesByPath(data.items, path);
        var structure = getFolderStructure(data.items);
        
        var container = data.element.closest('.torrent-list');
        var breadcrumbs = container.find('.torrent-path-navigation');
        var folder_list = container.find('.torrent-folder-list');
        var file_list = container.find('.torrent-file-list');
        
        if (breadcrumbs.length === 0) {
            container.prepend(renderBreadcrumbs(path));
            container.prepend('<div class="torrent-folder-list"></div>');
            breadcrumbs = container.find('.torrent-path-navigation');
            folder_list = container.find('.torrent-folder-list');
        }
        
        breadcrumbs.html(renderBreadcrumbs(path));
        folder_list.html(renderFolderList(structure, path));
        
        // Update original file list to show only files in current directory
        file_list.find('.torrent-file').each(function() {
            var file_path = $(this).data('path') || $(this).data('name');
            $(this).toggle(file_path.startsWith(path) && 
                          file_path.replace(path, '').split('/').length === 1);
        });
        
        // Handle navigation clicks
        container.find('.path-item').on('hover:enter', function() {
            var new_path = $(this).data('path');
            path_history.push(current_path);
            current_path = new_path;
            updateFileList(data, new_path);
        });
        
        container.find('.folder-item').on('hover:enter', function() {
            var new_path = $(this).data('path');
            path_history.push(current_path);
            current_path = new_path;
            updateFileList(data, new_path);
        });
    }

    function handleBackNavigation() {
        if (path_history.length > 0) {
            current_path = path_history.pop();
            return true;
        }
        return false;
    }

    Lampa.Listener.follow('torrent_file', function (data) {
        if (data.type == 'list_open') {
            list_opened = true;
            current_path = '';
            path_history = [];
        }
        
        if (data.type == 'list_close') {
            list_opened = false;
        }
        
        if (data.type == 'render' && list_opened) {
            updateFileList(data, current_path);
        }
    });

    // Add CSS for the navigation elements
    Lampa.Template.add('torrent_navigation_css', `
        <style>
            .torrent-path-navigation {
                display: flex;
                align-items: center;
                padding: 10px 0;
                flex-wrap: wrap;
            }
            
            .path-item {
                padding: 5px 10px;
                margin: 2px;
                border-radius: 4px;
                cursor: pointer;
                background-color: rgba(255,255,255,0.1);
            }
            
            .path-item.focus {
                background-color: rgba(255,255,255,0.2);
            }
            
            .path-separator {
                padding: 0 5px;
                opacity: 0.5;
            }
            
            .torrent-folder-list {
                margin-bottom: 15px;
            }
            
            .folder-item {
                display: flex;
                align-items: center;
                padding: 8px 15px;
                margin: 5px 0;
                border-radius: 4px;
                background-color: rgba(255,255,255,0.05);
            }
            
            .folder-item.focus {
                background-color: rgba(255,255,255,0.15);
            }
            
            .folder-icon {
                width: 20px;
                height: 20px;
                margin-right: 10px;
                background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>');
                background-size: contain;
                background-repeat: no-repeat;
                opacity: 0.7;
            }
        </style>
    `);
    
    $('body').append(Lampa.Template.get('torrent_navigation_css', {}, true));

    // Handle back button
    document.addEventListener('keydown', function(e) {
        if (e.keyCode === 8 || e.keyCode === 461) { // Backspace or Back button
            if (list_opened && handleBackNavigation()) {
                e.preventDefault();
                var container = $('.torrent-list:visible');
                if (container.length) {
                    var data = {
                        items: container.find('.torrent-file').toArray().map(function(el) {
                            return {
                                path: $(el).data('path'),
                                name: $(el).data('name')
                            };
                        }),
                        element: container
                    };
                    updateFileList(data, current_path);
                }
            }
        }
    });
})();
