const GLib = imports.gi.GLib;
const Gtk = imports.gi.Gtk;
const Gdk = imports.gi.Gdk;
const Lang = imports.lang;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;

//const Gettext = imports.gettext.domain('dynamic-panel-transparency');
//const _ = Gettext.gettext;

/* Settings Keys */
const SETTINGS_APP_MENUS = 'show-in-app-menu';
const SETTINGS_SHOW_ICONS = 'show-icons';
const SETTINGS_IGNORE_REMOTE_MENU = 'ignore-remote-menu';

function init() {
    //Convenience.initTranslations();
}

function buildPrefsWidget() {
    let widget = new SettingsUI();
    widget.show_all();

    return widget;
}

/* UI Setup */
const SettingsUI = new Lang.Class({
    Name: 'QuickListsReborn.Prefs.SettingsUI',
    GTypeName: 'SettingsUI',
    Extends: Gtk.Grid,

    _init: function(params) {

        this.parent(params);

        this.margin = 24;

        this.row_spacing = 6;

        this.orientation = Gtk.Orientation.VERTICAL;

        this.settings = Convenience.getSettings();


        let check = new Gtk.CheckButton({
            label: "Show Icons",
            tooltip_text: "Shows icons in menus if available.",
            margin_top: 6
        });
        check.set_active(this.settings.get_boolean(SETTINGS_SHOW_ICONS));
        check.connect('toggled', Lang.bind(this, function(value) {
            this.settings.set_boolean(SETTINGS_SHOW_ICONS, value.get_active());
        }));
        this.add(check);


        let subcheck = new Gtk.CheckButton({
            label: "Add to apps that already have their own custom menu.",
            tooltip_text: "Ignores RemoteMenu.",
            margin_top: 2,
            margin_left: 12
        });
        subcheck.set_active(this.settings.get_boolean(SETTINGS_IGNORE_REMOTE_MENU));
        subcheck.connect('toggled', Lang.bind(this, function(value) {
            this.settings.set_boolean(SETTINGS_IGNORE_REMOTE_MENU, value.get_active());
        }));


        check = new Gtk.CheckButton({
            label: "Show in App Menus",
            tooltip_text: "Shows quicklists in app menus.",
            margin_top: 6
        });
        check.set_active(this.settings.get_boolean(SETTINGS_APP_MENUS));
        check.connect('toggled', Lang.bind(this, function(value) {
            subcheck.set_sensitive(value.get_active());
            this.settings.set_boolean(SETTINGS_APP_MENUS, value.get_active());
        }));

        subcheck.set_sensitive(check.get_active());
        this.add(check);
        this.add(subcheck);


    },
});