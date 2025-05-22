(function() {
    'use strict';
    
    console.log('Initializing folder navigation plugin...');

    var list_opened = false;
    var current_path = '';
    var path_history = [];

    function getFolderStructure(files) {
        var structure = {};
        files.forEach(function(file) {
            var path = file.path || file.name || '';
            var parts = path.split('/');
            var current = structure;
            for (var i = 0; i < parts.length - 1; i++) {
                var part = parts[i];
                if (!current[part]) current[part] = {};
                current = current[part];
            }
        });
        return structure;
    }

    function renderBreadcrumbs(path) {
        if (!path) return '<div class="path-item" data-path="">Root</div>';
        
        var parts = path.split('/').filter(Boolean);
        var html = '<div class="path-item" data-path="">Root</div>';
        var currentPath = '';
        
        parts.forEach(function(part) {
            currentPath += part + '/';
            html += '<span class="path-separator">/</span>';
            html += '<div class="path-item" data-path="' + currentPath + '">' + part + '</div>';
        });
        
        return html;
    }

    function renderFolderList(structure, path) {
        var folders = structure;
        var pathParts = path ? path.split('/').filter(Boolean) : [];
        
        pathParts.forEach(function(part) {
            folders = folders[part] || {};
        });
        
        var html = '';
        Object.keys(folders).forEach(function(folder) {
            var fullPath = (path || '') + folder + '/';
            html += '<div class="folder-item selector" data-path="' + fullPath + '">';
            html += '<div class="folder-icon"></div>';
            html += '<div class="folder-name">' + folder + '</div>';
            html += '</div>';
        });
        
        return html || '<div class="no-folders">No folders</div>';
    }

    function findTorrentListContainer(element) {
        // Если element - объект файла, ищем соответствующий DOM-элемент
        if (element && typeof element === 'object' && element.path) {
            return document.querySelector('.torrent-list');
        }
        
        // Если это строка (селектор)
        if (typeof element === 'string') {
            return document.querySelector(element + ' .torrent-list') || 
                   document.querySelector('.torrent-list');
        }
        
        // Если это jQuery объект
        if (element && element.jquery) {
            return element.closest('.torrent-list')[0];
        }
        
        // Если это DOM-элемент
        if (element instanceof Element) {
            return element.closest('.torrent-list');
        }
        
        // По умолчанию ищем первый .torrent-list
        return document.querySelector('.torrent-list');
    }

    function updateFileList(data, path) {
        console.log('Updating file list for path:', path);
        
        try {
            var container = findTorrentListContainer(data.element);
            if (!container) {
                console.error('Torrent list container not found');
                return;
            }

            var structure = getFolderStructure(data.items);
            
            // Create navigation if not exists
            if (!container.querySelector('.torrent-navigation')) {
                container.insertAdjacentHTML('afterbegin', `
                    <div class="torrent-navigation">
                        <div class="torrent-path-navigation"></div>
                        <div class="torrent-folder-list"></div>
                    </div>
                `);
            }

            // Update breadcrumbs
            container.querySelector('.torrent-path-navigation').innerHTML = renderBreadcrumbs(path);
            
            // Update folder list
            container.querySelector('.torrent-folder-list').innerHTML = renderFolderList(structure, path);
            
            // Filter files
            var fileList = container.querySelector('.torrent-file-list');
            if (fileList) {
                Array.from(fileList.children).forEach(function(fileEl) {
                    var filePath = fileEl.dataset.path || fileEl.dataset.name || '';
                    var inCurrentDir = path ? 
                        (filePath.startsWith(path) && filePath.replace(path, '').split('/').length === 1) :
                        (filePath.indexOf('/') === -1);
                    fileEl.style.display = inCurrentDir ? '' : 'none';
                });
            }

            // Add event listeners
            container.querySelectorAll('.path-item').forEach(function(el) {
                el.onclick = function() {
                    path_history.push(current_path);
                    current_path = this.dataset.path || '';
                    updateFileList(data, current_path);
                };
            });

            container.querySelectorAll('.folder-item').forEach(function(el) {
                el.onclick = function() {
                    path_history.push(current_path);
                    current_path = this.dataset.path || '';
                    updateFileList(data, current_path);
                };
            });

        } catch (e) {
            console.error('Error in updateFileList:', e);
        }
    }

    // Handle Lampa events
    Lampa.Listener.follow('torrent_file', function(data) {
        console.log('Torrent file event:', data.type);
        
        if (data.type === 'list_open') {
            list_opened = true;
            current_path = '';
            path_history = [];
        }
        else if (data.type === 'list_close') {
            list_opened = false;
        }
        else if (data.type === 'render' && list_opened) {
            updateFileList(data, current_path);
        }
    });

    // Add styles
    Lampa.Template.add('torrent_navigation_css', `
        <style>
            .torrent-navigation {
                margin-bottom: 15px;
            }
            
            .torrent-path-navigation {
                display: flex;
                align-items: center;
                flex-wrap: wrap;
                gap: 5px;
                margin-bottom: 10px;
                font-size: 1.1em;
            }
            
            .path-item {
                padding: 5px 10px;
                border-radius: 4px;
                cursor: pointer;
                background-color: rgba(255,255,255,0.1);
            }
            
            .path-item.focus, .path-item:hover {
                background-color: rgba(255,255,255,0.2);
            }
            
            .path-separator {
                opacity: 0.5;
            }
            
            .torrent-folder-list {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                gap: 8px;
                margin-bottom: 15px;
            }
            
            .folder-item {
                display: flex;
                align-items: center;
                padding: 10px;
                border-radius: 4px;
                background-color: rgba(255,255,255,0.05);
                cursor: pointer;
            }
            
            .folder-item.focus, .folder-item:hover {
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
            
            .no-folders {
                opacity: 0.7;
                padding: 10px;
                text-align: center;
            }
        </style>
    `);
    
    document.head.insertAdjacentHTML('beforeend', Lampa.Template.get('torrent_navigation_css', {}, true));

    console.log('Folder navigation plugin initialized successfully');
})();
