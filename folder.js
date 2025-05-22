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
            var path = file.path || file.name;
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

    function updateFileList(data, path) {
        console.log('Обновление списка файлов для пути:', path);
        
        try {
            // Получаем корневой элемент
            var root_element = data.element;
            if (typeof root_element === 'string') {
                root_element = document.querySelector(root_element);
            }
            if (!root_element) {
                console.error('Не удалось найти корневой элемент');
                return;
            }

            // Находим контейнер
            var container = root_element.closest('.torrent-list');
            if (!container) {
                console.error('Не найден .torrent-list контейнер');
                return;
            }

            // Создаём структуру папок
            var structure = getFolderStructure(data.items);
            
            // Добавляем навигацию
            if (!container.querySelector('.torrent-navigation')) {
                container.insertAdjacentHTML('afterbegin', `
                    <div class="torrent-navigation">
                        <div class="torrent-path-navigation"></div>
                        <div class="torrent-folder-list"></div>
                    </div>
                `);
            }

            // Обновляем хлебные крошки
            container.querySelector('.torrent-path-navigation').innerHTML = 
                renderBreadcrumbs(path);

            // Обновляем список папок
            container.querySelector('.torrent-folder-list').innerHTML = 
                renderFolderList(structure, path);

            // Фильтруем файлы
            filterAndDisplayFiles(container, data.items, path);

        } catch (e) {
            console.error('Ошибка в updateFileList:', e);
        }
    }

    function filterAndDisplayFiles(container, files, path) {
        var file_list = container.querySelector('.torrent-file-list');
        if (!file_list) return;

        Array.from(file_list.children).forEach(function(file_el) {
            var file_path = file_el.dataset.path || file_el.dataset.name || '';
            var in_current_dir = file_path.startsWith(path) && 
                               file_path.replace(path, '').split('/').length === 1;
            file_el.style.display = in_current_dir ? '' : 'none';
        });
    }

    // [Остальные функции (renderBreadcrumbs, renderFolderList) остаются без изменений]

    // Обработчики событий Lampa
    Lampa.Listener.follow('torrent_file', function(data) {
        console.log('Событие torrent_file:', data.type);
        
        if (data.type === 'list_open') {
            list_opened = true;
            current_path = '';
            path_history = [];
            console.log('Открыт список файлов');
        }
        else if (data.type === 'list_close') {
            list_opened = false;
        }
        else if (data.type === 'render' && list_opened) {
            console.log('Рендер списка файлов', data);
            updateFileList(data, current_path);
        }
    });

    // [Остальной код (стили, обработка клавиш) остаётся без изменений]

    console.log('Плагин навигации по папкам успешно инициализирован');
})();
