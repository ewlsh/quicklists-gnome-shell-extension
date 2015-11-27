const AppDisplay = imports.ui.appDisplay;
const PopupMenu = imports.ui.popupMenu;
const RemoteMenu = imports.ui.remoteMenu;
const Main = imports.ui.main;
const Panel = imports.ui.panel;
const Lang = imports.lang;
const St = imports.gi.St;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;

function get_key_file(shellApp) {
    let keyfile = null;
    let app = shellApp.get_app_info();

    let desktopFile = app.get_filename();

    if (!GLib.file_test(desktopFile, GLib.FileTest.EXISTS))
        return null;

    keyfile = new GLib.KeyFile();

    keyfile.load_from_file(desktopFile, GLib.KeyFileFlags.NONE);


    return keyfile;
}

function get_name_for_action(keyfile, action, search_locale, ayatana = true) {
    let group = null;
    if (ayatana)
        group = action + ' Shortcut Group';
    else
        group = 'Desktop Action ' + action;

    let name = null;

    // search 'Name' key localized value
    if (search_locale) {
        let lang = GLib.get_language_names();
        for (let i = 0; i < lang.length; i++) {
            try {
                name = keyfile.get_locale_string(group, 'Name', lang[i]);
            } catch (e) {}
            if (name != null) break;
        }
    }
    if (name == null) {
        try {
            name = keyfile.get_string(group, 'Name');
        } catch (e) {}
    }
    return name;
}


function get_item_from_action(keyfile, action, app, icons, ayatana = true) {
    let group = null;
    if (ayatana)
        group = action + ' Shortcut Group';
    else
        group = 'Desktop Action ' + action;

    let item = null;

    let name = null;
    let exec = null;

    // search 'Name' key localized value
    let lang = GLib.get_language_names();
    for (let i = 0; i < lang.length; i++) {
        try {
            name = keyfile.get_locale_string(group, 'Name', lang[i]);
        } catch (e) {}
        if (name != null) break;
    }
    if (name == null) {
        try {
            name = keyfile.get_string(group, 'Name');
        } catch (e) {}
    }

    try {
        exec = keyfile.get_string(group, 'Exec');
    } catch (e) {}

    // (image) menu item


    // if action entries are correct build menu item
    if ((name != null) && (exec != null)) {
        let iconName = null;
        if (icons) {
            try {
                iconName = keyfile.get_string(group, 'Icon');
            } catch (e) {}
        }
        if (iconName !== null && icons) {
            item = new PopupMenu.PopupImageMenuItem(name, iconName);
        } else {
            item = new PopupMenu.PopupMenuItem(name);

        }
        if (ayatana) {
            item.connect('activate', function() {
                // maybe not so good, but in most cases works...
                try {
                    GLib.spawn_command_line_async(exec.split('%')[0]);
                } catch (e) {
                    global.logError('' + e);
                }
            });
        } else {
            item.connect('activate', Lang.bind(this, function(emitter, event) {
                app.launch_action(action, event.get_time(), -1);
                this.emit('activate-window', null);
            }));
        }
    }

    return item;
}

function get_actions(keyfile, ayatana = true) {
    let actions = [];

    if (ayatana) {
        try {
            actions = keyfile.get_string_list('Desktop Entry', 'X-Ayatana-Desktop-Shortcuts');
        } catch (e) {}
    } else {
        try {
            actions = keyfile.get_string_list('Desktop Entry', 'Actions');
        } catch (e) {}
    }
    return actions;
}