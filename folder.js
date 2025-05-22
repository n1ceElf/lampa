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
        // Проверка и нормализация элемента
        var element = data.element;
        if (typeof element === 'string') {
            element = document.querySelector(element);
        } else if (element && element.jquery) {
            element = element[0];
        }

        if (!element || !element.closest) {
            console.error('Invalid element provided:', element);
            return;
        }

        var container = element.closest('.torrent-list');
        if (!container) {
            console.error('Could not find .torrent-list container');
            return;
        }

        var filtered_files = filterFilesByPath(data.items, path);
        var structure = getFolderStructure(data.items);
        
        var breadcrumbs = container.querySelector('.torrent-path-navigation');
        var folder_list = container.querySelector('.torrent-folder-list');
        var file_list = container.querySelector('.torrent-file-list');
        
        if (!breadcrumbs) {
            container.insertAdjacentHTML('afterbegin', renderBreadcrumbs(path));
            container.insertAdjacentHTML('afterbegin', '<div class="torrent-folder-list"></div>');
            breadcrumbs = container.querySelector('.torrent-path-navigation');
            folder_list = container.querySelector('.torrent-folder-list');
        }
        
        breadcrumbs.innerHTML = renderBreadcrumbs(path);
        folder_list.innerHTML = renderFolderList(structure, path);
        
        // Обновление списка файлов
        if (file_list) {
            var file_elements = file_list.querySelectorAll('.torrent-file');
            file_elements.forEach(function(file_el) {
                var file_path = file_el.dataset.path || file_el.dataset.name;
                file_el.style.display = file_path.startsWith(path) && 
                                      file_path.replace(path, '').split('/').length === 1 
                                      ? '' : 'none';
            });
        }
        
        // Обработчики событий
        container.querySelectorAll('.path-item').forEach(function(el) {
            el.removeEventListener('click', pathItemHandler);
            el.addEventListener('click', pathItemHandler);
        });
        
        container.querySelectorAll('.folder-item').forEach(function(el) {
            el.removeEventListener('click', folderItemHandler);
            el.addEventListener('click', folderItemHandler);
        });
    }

    function pathItemHandler() {
        var new_path = this.dataset.path;
        path_history.push(current_path);
        current_path = new_path;
        Lampa.Listener.send('torrent_file', {type: 'navigate', path: new_path});
    }

    function folderItemHandler() {
        var new_path = this.dataset.path;
        path_history.push(current_path);
        current_path = new_path;
        Lampa.Listener.send('torrent_file', {type: 'navigate', path: new_path});
    }

    function handleBackNavigation() {
        if (path_history.length > 0) {
            current_path = path_history.pop();
            return true;
        }
        return false;
    }

    // Обработчики событий Lampa
    Lampa.Listener.follow('torrent_file', function (data) {
        if (data.type === 'list_open') {
            list_opened = true;
            current_path = '';
            path_history = [];
        }
        
        if (data.type === 'list_close') {
            list_opened = false;
        }
        
        if (data.type === 'render' && list_opened) {
            updateFileList(data, current_path);
        }
        
        if (data.type === 'navigate') {
            updateFileList(data, data.path);
        }
    });

    // Обработка кнопки "Назад"
    document.addEventListener('keydown', function(e) {
        if ((e.keyCode === 8 || e.keyCode === 461) && list_opened) {
            if (handleBackNavigation()) {
                e.preventDefault();
                var container = document.querySelector('.torrent-list:not([style*="display: none"])');
                if (container) {
                    var data = {
                        items: Array.from(container.querySelectorAll('.torrent-file')).map(function(el) {
                            return {
                                path: el.dataset.path,
                                name: el.dataset.name
                            };
                        }),
                        element: container
                    };
                    updateFileList(data, current_path);
                }
            }
        }
    });

    // Стили для навигации
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
    
    document.head.insertAdjacentHTML('beforeend', Lampa.Template.get('torrent_navigation_css', {}, true));
})();
