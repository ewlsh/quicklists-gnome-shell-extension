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

const St = imports.gi.St;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;

let settings = null;

function setQuicklist(shellApp, popUpMenu) {
    if (!shellApp || !popUpMenu) return;
    if (shellApp.is_window_backed()) return

    let keyfile = null;
    let ayatana = false;

    let app = shellApp.get_app_info();

    let desktopFile = app.get_filename();

    if (GLib.file_test(desktopFile, GLib.FileTest.EXISTS) == false)
        return;

    function _item_from_action(action) {
        let group = null;

        // Ayatana Project or FreeDesktop spec entries 
        if (ayatana) 
            group =  action + ' Shortcut Group';
        else
            group = 'Desktop Action ' + action;

        // environments selection
        if (settings.get_boolean('showin-rules')) {
            let onlyShowIn = ayatana ? 'TargetEnvironment' : 'OnlyShowIn';
            let notShowIn = 'NotShowIn';

            let environments = null;
            let showUp = false;

            try {environments = keyfile.get_string(group, onlyShowIn);} catch(e) {showUp = true;}
            if (environments != null) {
                if (environments.indexOf('GNOME') != -1) 
                    showUp = true;
            }
            else {
                try {environments = keyfile.get_string(group, notShowIn);} catch(e) {showUp = true;}
                if (environments != null) 
                    if (environments.indexOf('GNOME') != -1)
                        showUp = false;
            }

            if (showUp == false) return null;
        }

        let item = null;

        let name = null;
        let exec = null;

        // search 'Name' key localized value
        let lang = GLib.get_language_names();
        for (let i=0; i<lang.length; i++) {
            try {name = keyfile.get_locale_string(group, 'Name', lang[i]);} catch (e) {}
            if (name != null) break;
        }
        if (name == null) {
            try {name = keyfile.get_string(group, 'Name');} catch(e) {}
        }

        try {
            exec = keyfile.get_string(group, 'Exec');
        } catch (e) {}

        // (image) menu item
        function _imageMenuItem(name, iconName, iconSize, iconType) {
            let item = new PopupMenu.PopupMenuItem(name);

            if (iconName != null) {
                if (iconSize == null) iconSize = 16;
                if (iconType == null) iconType = St.IconType.FULLCOLOR;
                let icon = null;

                // is '/path/to/filename'?
                if (GLib.path_is_absolute(iconName)) {
                    try {
                    let gicon = new Gio.Icon.new_for_string(iconName);
                    } catch (e)  {
                    global.logError('' + e);
                    }
                    if (gicon != null) {
                        icon = new St.Icon({icon_size: iconSize});
                        icon.set_gicon(gicon);
                    }
                }
                else {
                    // is 'name.png', must be 'name'?
                    if (iconName[iconName.length-4] == '.') {
                        let ext = iconName.slice(iconName.length-3);
                        if ( (ext == 'png') || (ext == 'svg') || (ext == 'xpm') )
                            iconName = iconName.slice(0, iconName.length-4);
                    }

                    // is themed name icon
                    icon = new St.Icon({ icon_name: iconName, icon_size: iconSize, icon_type: iconType });
                }
                if (icon)
                    item.addActor(icon, { align: St.Align.END });
            }

            return item;
        }

        // if action entries are correct build menu item
        if ( (name != null) && (exec != null) ) {
            let iconName = null;
            if (settings.get_boolean('icon')) {
                try {iconName = keyfile.get_string(group, 'Icon');} catch(e) {}
            }
            item = _imageMenuItem(name, iconName, 
                settings.get_int('icon-size'), 
                settings.get_boolean('icon-symbolic') ? St.IconType.SYMBOLIC : St.IconType.FULLCOLOR
            );
            item.connect('activate', function() {
                // maybe not so good, but in most cases works...
                try { GLib.spawn_command_line_async(exec.split('%')[0]); } catch (e) {global.logError('' + e);}
            });
        }

        return item;
    }

    function _get_actions() {
        let actions = null;

        if (settings.get_boolean('freedesktop-spec')) {
            try {
                actions = keyfile.get_string_list('Desktop Entry', 'Actions');
            } catch(e) {}
        }

        if (settings.get_boolean('ayatana-spec')) {
            if (actions == null) {
                ayatana = true;
                try {
                    actions = keyfile.get_string_list('Desktop Entry', 'X-Ayatana-Desktop-Shortcuts');
                }
                catch(e) { 
                    ayatana = false; 
                }
            }
        }

        return actions;
    }

    function _appendActionsList() {
        let actions = _get_actions();
        let n = 0;

        if (actions != null) {

            for (let i=0; i<actions.length; i++) {
                let item = _item_from_action(actions[i]);

                if (item) {
                    popUpMenu.addMenuItem(item, n);
                    n = n + 1;
                }
            }
        }

        if (n != 0) {
            let item = new PopupMenu.PopupSeparatorMenuItem();
            popUpMenu.addMenuItem(item, n);
        }
    }

    keyfile = new GLib.KeyFile();

    if (keyfile.load_from_file(desktopFile, GLib.KeyFileFlags.NONE) == true) {
        _appendActionsList();
    }

    //keyfile.free();
    keyfile = null;
}

let origAppIconMenu_redisplay = null;
let origAppMenuButton_maybeSetMenu = null;
let appMenuQuicklistEnabled = false;

function _enableQuicklistInAppMenu() {
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
}

function init() {
    settings = Convenience.getSettings(Me, 'quicklists');
}

function enable() {
    origAppIconMenu_redisplay = AppDisplay.AppIconMenu.prototype._redisplay;
    AppDisplay.AppIconMenu.prototype._redisplay = function() {
        origAppIconMenu_redisplay.call(this);
        setQuicklist(this._source.app, this);
    };

    if (settings.get_boolean('in-appmenu'))
        _enableQuicklistInAppMenu();
}

function disable() {
    AppDisplay.AppIconMenu.prototype._redisplay = origAppIconMenu_redisplay;

    if (appMenuQuicklistEnabled)
        _disbaleQuicklistInAppMenu();
}

