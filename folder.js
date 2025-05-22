(function() {
    'use strict';

    console.log('Инициализация плагина навигации по папкам...');

    var list_opened = false;
    var current_path = '';
    var path_history = [];

    function getFolderStructure(files) {
        console.log('Построение структуры папок...');
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
        if (!path) return '';
        var parts = path.split('/');
        var crumbs = [];
        var accum = '';
        parts.forEach(function(part, i) {
            accum += (i === 0 ? '' : '/') + part;
            crumbs.push(`<span class="breadcrumb" data-path="${accum}">${part}</span>`);
        });
        return crumbs.join(' / ');
    }

    function renderFolderList(structure, path) {
        var folders = structure;
        if (path) {
            var parts = path.split('/');
            for (var i = 0; i < parts.length; i++) {
                folders = folders[parts[i]] || {};
            }
        }
        var html = '';
        Object.keys(folders).forEach(function(folder) {
            var fullPath = (path ? path + '/' : '') + folder;
            html += `<div class="folder-item" data-path="${fullPath}">${folder}</div>`;
        });
        return html || '<div class="no-folders">Папок нет</div>';
    }

    function updateFileList(data, path) {
        console.log('Обновление списка файлов для пути:', path);

        try {
            var root_element = data.element;

            // Проверяем тип data.element и ищем DOM-элемент по-разному
            if (typeof root_element === 'string') {
                root_element = document.querySelector(root_element);
            } else if (root_element && root_element.jquery) {
                root_element = root_element[0];
            } else if (root_element && typeof root_element === 'object' && !(root_element instanceof Element)) {
                // Если это объект файла, пытаемся найти DOM-элемент по data-path
                if (root_element.path) {
                    root_element = document.querySelector(`[data-path="${CSS.escape(root_element.path)}"]`);
                } else {
                    console.error('data.element передан объектом без path:', root_element);
                    return;
                }
            }

            if (!(root_element instanceof Element)) {
                console.error('root_element не является DOM-элементом');
                return;
            }

            var container = root_element.closest('.torrent-list');
            if (!container) {
                console.error('Не найден .torrent-list контейнер');
                return;
            }

            var structure = getFolderStructure(data.items);

            if (!container.querySelector('.torrent-navigation')) {
                container.insertAdjacentHTML('afterbegin', `
                    <div class="torrent-navigation">
                        <div class="torrent-path-navigation"></div>
                        <div class="torrent-folder-list"></div>
                    </div>
                `);
            }

            container.querySelector('.torrent-path-navigation').innerHTML = renderBreadcrumbs(path);
            container.querySelector('.torrent-folder-list').innerHTML = renderFolderList(structure, path);

            filterAndDisplayFiles(container, data.items, path);

            // Вешаем обработчики кликов на хлебные крошки
            var breadcrumbs = container.querySelectorAll('.torrent-path-navigation .breadcrumb');
            breadcrumbs.forEach(function(crumb) {
                crumb.onclick = function() {
                    current_path = crumb.dataset.path || '';
                    updateFileList(data, current_path);
                };
            });

            // Вешаем обработчики кликов на папки
            var folder_items = container.querySelectorAll('.torrent-folder-list .folder-item');
            folder_items.forEach(function(folder) {
                folder.onclick = function() {
                    var newPath = folder.dataset.path || '';
                    if (newPath) {
                        path_history.push(current_path);
                        current_path = newPath;
                        updateFileList(data, current_path);
                    }
                };
            });

        } catch (e) {
            console.error('Ошибка в updateFileList:', e);
        }
    }

    function filterAndDisplayFiles(container, files, path) {
        var file_list = container.querySelector('.torrent-file-list');
        if (!file_list) return;

        Array.from(file_list.children).forEach(function(file_el) {
            var file_path = file_el.dataset.path || file_el.dataset.name || '';
            var in_current_dir = false;
            if (path === '') {
                // показываем только файлы в корне (без вложений)
                in_current_dir = file_path.indexOf('/') === -1;
            } else if (file_path.startsWith(path)) {
                // проверяем, что файл в текущей папке, а не в поддиректории
                var rest = file_path.slice(path.length);
                in_current_dir = rest.indexOf('/') === -1 && (rest !== '');
            }
            file_el.style.display = in_current_dir ? '' : 'none';
        });
    }

    // Слушатель событий Lampa
    Lampa.Listener.follow('torrent_file', function(data) {
        console.log('Событие torrent_file:', data.type);

        if (data.type === 'list_open') {
            list_opened = true;
            current_path = '';
            path_history = [];
            console.log('Открыт список файлов');
        } else if (data.type === 'list_close') {
            list_opened = false;
        } else if (data.type === 'render' && list_opened) {
            console.log('Рендер списка файлов', data);
            updateFileList(data, current_path);
        }
    });

    console.log('Плагин навигации по папкам успешно инициализирован');
})();
