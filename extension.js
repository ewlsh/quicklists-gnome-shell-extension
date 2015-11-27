/**
// Quicklists
// Copyright 2012  Damian Brun
//
// Licence: GPLv2+
**/

const AppDisplay = imports.ui.appDisplay;
const PopupMenu = imports.ui.popupMenu;
const RemoteMenu = imports.ui.remoteMenu;
const Main = imports.ui.main;
const Panel = imports.ui.panel;
const Lang = imports.lang;
const St = imports.gi.St;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;
const DesktopFile = Me.imports.desktopfile;

const SETTINGS_APP_MENUS = 'in-appmenu';
const SETTINGS_SHOW_ICONS = 'show-icons';

const ORIGINAL_AppMenuButton_maybeSetMenu = Panel.AppMenuButton.prototype._maybeSetMenu;
const ORIGINAL_AppIconMenu_redisplay = AppDisplay.AppIconMenu.prototype._redisplay;

let settings_manager = null;

function init() {
    this.settings = null;
}



function enable() {
    settings = Convenience.getSettings();
    bind_settings();
    AppDisplay.AppIconMenu.prototype._redisplay = qlrAppIconMenu_redisplay;
    if (this.settings_manager.show_in_appmenus) {
        Panel.AppMenuButton.prototype._maybeSetMenu = qlrAppMenuButton_maybeSetMenu;
        Main.panel._maybeSetMenu();
    }
}

function disable() {
    AppDisplay.AppIconMenu.prototype._redisplay = ORIGINAL_AppIconMenu_redisplay;
    if (this.settings_manager.show_in_appmenus) {
        Panel.AppMenuButton.prototype._maybeSetMenu = ORIGINAL_AppMenuButton_maybeSetMenu;
        Main.panel._maybeSetMenu();
    }
}

function qlrAppIconMenu_redisplay() {
    let window_backed = this._source.app.is_window_backed();
    let original = null;
    let keyfile = null;
    if (window_backed || (keyfile = DesktopFile.get_key_file(this._source.app)) === null) {
        ORIGINAL_AppIconMenu_redisplay.call(this);
        return;
    }
    let ayatana_actions = DesktopFile.get_actions(keyfile);
    let freedesktop_actions = DesktopFile.get_actions(keyfile, false);
    // don't let gnome shell add 'new window' if there is already a good common for it
    let remove_new_window = ayatana_actions.some(function(element) {
        let name = DesktopFile.get_name_for_action(keyfile, element, false);
        if (name.replace('-', '').replace(' ', '').toLowerCase().indexOf("new") != -1) {
            return true;
        }
        return false;
    }) || freedesktop_actions.some(function(element) {
        let name = DesktopFile.get_name_for_action(keyfile, element, false, false);
        if (name.replace('-', '').replace(' ', '').toLowerCase().indexOf("new") != -1) {
            return true;
        }
        return false;
    });;



    if (remove_new_window) {
        original = this._source.app.__proto__.can_open_new_window;
        this._source.app.__proto__.can_open_new_window = function() {
            return false;
        }
    }

    // call original
    ORIGINAL_AppIconMenu_redisplay.call(this);

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

        let item = DesktopFile.get_item_from_action(keyfile, action, null, settings_manager.show_icons);
        this.addMenuItem(item, index++);
    }
}


function qlrAppMenuButton_maybeSetMenu() {

    // destroy active menu - always create new
    this.setMenu(null);
    ORIGINAL_AppMenuButton_maybeSetMenu.call(this);

    if (this.menu !== null && this._targetApp !== null) {


        let items = this.menu._getMenuItems();


        let index = 0; //
        if (this.menu instanceof RemoteMenu.RemoteMenu) {
            if (items.length == 0)
                index = 0;
            else
                index = items.length;
        } else {
            for (; index < items.length; ++index) {

                if (items[index] instanceof PopupMenu.PopupSeparatorMenuItem) {

                    index--;
                    break;
                }
            }
            if (index == items.length) {
                index = 0;
            }
        }

        let window_backed = this._targetApp.is_window_backed();
        let original = null;
        let keyfile = null;
        if (window_backed || (keyfile = get_key_file(this._targetApp)) === null) {
            return;
        }
        let ayatana_actions = DesktopFile.get_actions(keyfile).reverse();
        let freedesktop_actions = DesktopFile.get_actions(keyfile, false).reverse();


        for (let i = 0; i < freedesktop_actions.length; i++) {
            let action = freedesktop_actions[i];

            let item = DesktopFile.get_item_from_action(keyfile, action, this._targetApp, settings_manager.show_icons,false);


            this.menu.addMenuItem(item, index);

        }


        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem(), index);
        for (let i = 0; i < ayatana_actions.length; i++) {
            let action = ayatana_actions[i];

            let item = DesktopFile.get_item_from_action(keyfile, action,settings_manager.show_icons, null);


            this.menu.addMenuItem(item, index);

        }

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem(), index);
    }
    /* Main.panel._menuManager.activeMenu().setMenu(null);
        if (Main.panel._appMenu._targetApp != null)
            Main.panel._appMenu._maybeSetMenu();

        // force re-create AppMenu for probable active window

        // if (Main.panel._appMenu._targetApp != null)
        //   Main.panel._appMenu._maybeSetMenu();
*/


}

function bind_settings() {
    let use_icons = this.settings.get_boolean(SETTINGS_SHOW_ICONS);
    let show_in_appmenus = this.settings.get_boolean(SETTINGS_APP_MENUS);


    settings_manager = new SettingsManager(this.settings, use_icons, show_in_appmenus);

    this.settingsBoundIds = [];

    this.settingsBoundIds.push(this.settings.connect('changed::' + SETTINGS_SHOW_ICONS, Lang.bind(this, function() {
        this.settings.connect('changed::' + SETTINGS_SHOW_ICONS, Lang.bind(this, function() {
                settings_manager.update({
                    use_icons: this.settings.get_boolean(SETTINGS_SHOW_ICONS)
                });
            })),
            this.settings.connect('changed::' + SETTINGS_APP_MENUS, Lang.bind(this, function() {
                settings_manager.update({
                    show_in_appmenus: this.settings.get_boolean(SETTINGS_APP_MENUS)
                });
            }));

    })));

}

function unbind_settings() {
    for (let i = 0; i < this.settingsBoundIds.length; ++i) {
        this.settings.disconnect(this.settingsBoundIds[i]);
    }
}


const SettingsManager = new Lang.Class({
    Name: 'SettingsManager',
    _init: function(settings, show_icons, show_in_appmenus) {
        this.settings = settings;
        this.show_icons = show_icons;
        this.show_in_appmenus = show_in_appmenus;
    },
    update: function(params = null) {
        if (params === null)
            params = {
                show_icons: show_iconthis.settings.get_boolean(SETTINGS_SHOW_ICONS),
                show_in_appmenus: this.settings.get_boolean(SETTINGS_SHOW_ICONS)
            };

        this.show_icons = is_undef(params.show_icons) ? this.settings.get_boolean(SETTINGS_SHOW_ICONS) : params.show_icons;
        this.show_in_appmenus = is_undef(params.show_in_appmenus) ? this.settings.get_boolean(SETTINGS_APP_MENUS) : params.use_in_appmenus;

    }
});