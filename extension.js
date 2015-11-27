/**
// Quicklists
// Copyright 2012  Damian Brun
//
// Licence: GPLv2+
**/

const AppDisplay = imports.ui.appDisplay;
const PopupMenu = imports.ui.popupMenu;
const Main = imports.ui.main;
const Panel = imports.ui.panel;
const Lang = imports.lang;
const St = imports.gi.St;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;

let settings = null;

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

function get_item_from_action(keyfile, action) {
    let group = action + ' Shortcut Group';

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
        if (settings.get_boolean('icon')) {
            try {
                iconName = keyfile.get_string(group, 'Icon');
            } catch (e) {}
        }
        if (iconName !== null) {
            item = new PopupMenu.PopupImageMenuItem(name, iconName);
        } else {
            item = new PopupMenu.PopupMenuItem(name);

        }
        item.connect('activate', function() {
            // maybe not so good, but in most cases works...
            try {
                GLib.spawn_command_line_async(exec.split('%')[0]);
            } catch (e) {
                global.logError('' + e);
            }
        });
    }

    return item;
}






function get_actions(keyfile) {
    let actions = [];

    try {
        actions = keyfile.get_string_list('Desktop Entry', 'X-Ayatana-Desktop-Shortcuts');
    } catch (e) {}

    return actions;
}


let origAppIconMenu_redisplay = null;
let origAppIconMenu_removeAll = null;
let origAppMenuButton_maybeSetMenu = null;
let appMenuQuicklistEnabled = false;

function init() {
    settings = null;
}

function enable() {
    settings = Convenience.getSettings();
    origAppIconMenu_redisplay = AppDisplay.AppIconMenu.prototype._redisplay;



    AppDisplay.AppIconMenu.prototype._redisplay = function() {
        let window_backed = this._source.app.is_window_backed();
        let original = null;
        let keyfile = null;
        if (window_backed || (keyfile = get_key_file(this._source.app)) === null) {
            origAppIconMenu_redisplay.call(this);
            return;
        }
        let ayatana_actions = get_actions(keyfile);
        let remove_new_window = ayatana_actions.some(function(element) {
            if ('newwindow' === element.replace('-', '').replace(' ', '').toLowerCase()) {
                return true;
            }
            return false;
        });

        if (remove_new_window) {
            original = this._source.app.__proto__.can_open_new_window;
            this._source.app.__proto__.can_open_new_window = function() {
                return false;
            }
        }

        // call original
        origAppIconMenu_redisplay.call(this);

        if (remove_new_window) {
            this._source.app.__proto__.can_open_new_window = original;
            original = null;
        }

        let windows_ = this._source.app.get_windows().filter(function(w) {
            return !w.skip_taskbar;
        });
        let activeWorkspace_ = global.screen.get_active_workspace();
        let separatorShown_ = windows_.length > 0 && windows_[0].get_workspace() != activeWorkspace_;
        let index = 0;
        for (let i = 0; i < windows_.length; i++) {
            let window = windows_[i];
            if (!separatorShown_ && window.get_workspace() != activeWorkspace_) {
                index++;
                separatorShown_ = true;
            }
            index++;
        }
        this.addMenuItem(new PopupMenu.PopupSeparatorMenuItem(), index++);
        for (let i = 0; i < ayatana_actions.length; i++) {
            let action = ayatana_actions[i];

            let item = get_item_from_action(keyfile, action);
            this.addMenuItem(item, index++);
        }
    };
}

function disable() {
    AppDisplay.AppIconMenu.prototype._redisplay = origAppIconMenu_redisplay;
}


/*function _enableQuicklistInAppMenu() {
    origAppMenuButton_maybeSetMenu = Panel.AppMenuButton.prototype._maybeSetMenu;
    Panel.AppMenuButton.prototype._maybeSetMenu = function() {
        // destroy active menu - always create new
        this.setMenu(null);

        origAppMenuButton_maybeSetMenu.call(this);

        if (this.menu && !(this.menu instanceof PopupMenu.RemoteMenu))
            setQuicklist(this._targetApp, this.menu);
    };

    // force re-create AppMenu for probable active window
    Main.panel._appMenu.setMenu(null);
    if (Main.panel._appMenu._targetApp != null)
        Main.panel._appMenu._maybeSetMenu();

    appMenuQuicklistEnabled = true;
}

function _disbaleQuicklistInAppMenu() {
    Panel.AppMenuButton.prototype._maybeSetMenu = origAppMenuButton_maybeSetMenu;

    // force re-create AppMenu for probable active window
    Main.panel._appMenu.setMenu(null);
    if (Main.panel._appMenu._targetApp != null)
        Main.panel._appMenu._maybeSetMenu();
}*/