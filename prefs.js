/**
// Quicklists - prefs dialog
// Copyright 2012  Damian Brun
//
// Licence: GPLv2+
**/

const Gtk = imports.gi.Gtk;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;

const Lang = imports.lang;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;

function init() {}

function buildPrefsWidget() {
    let settings = Convenience.getSettings(Me, 'quicklists');

    let mainBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, margin: 20 });

    let grid = new Gtk.Grid({ row_spacing: 1, column_spacing: 15  });

    let infoLabel = new Gtk.Label ({ use_markup: true , margin:10});

    let specLabel = new Gtk.Label({ label: "<b>Specification:</b>" , use_markup: true, xalign: 0 , margin_right: 20});
    grid.attach(specLabel, 0,0,1,1);

    let freedesktopSpecCheck = new Gtk.CheckButton({ label: "FreeDesktop"});
    grid.attach(freedesktopSpecCheck, 1,0,2,1);
    freedesktopSpecCheck.set_active(settings.get_boolean('freedesktop-spec'));
    freedesktopSpecCheck.connect('toggled', function(widget) {
        settings.set_boolean('freedesktop-spec', widget.get_active());
    });
    freedesktopSpecCheck.connect('enter-notify-event', function(widget, event) {
        infoLabel.set_label("<i>Desktop Actions</i>");
    });
    freedesktopSpecCheck.connect('leave-notify-event', function(widget, event) {
        infoLabel.set_label("");
    });

    let ayatanaSpecCheck = new Gtk.CheckButton({ label: "Ayatana Project" });
    grid.attach(ayatanaSpecCheck, 1,1,2,1);
    ayatanaSpecCheck.set_active(settings.get_boolean('ayatana-spec'));
    ayatanaSpecCheck.connect('toggled', function(widget) {
        settings.set_boolean('ayatana-spec', widget.get_active());
    });
    ayatanaSpecCheck.connect('enter-notify-event', function(widget, event) {
        infoLabel.set_label("<i>Old-style Unity Shortcut Groups</i>");
    });
    ayatanaSpecCheck.connect('leave-notify-event', function(widget, event) {
        infoLabel.set_label("");
    });

    freedesktopSpecCheck.connect('toggled', function(widget) {
        if (!widget.get_active() && !ayatanaSpecCheck.get_active()) {
            ayatanaSpecCheck.set_active(true);
        }
    });
    ayatanaSpecCheck.connect('toggled', function(widget) {
        if (!widget.get_active() && !freedesktopSpecCheck.get_active()) {
            freedesktopSpecCheck.set_active(true);
        }
    });

    let selectionEnvironmentCheck = new Gtk.CheckButton({ label: "Environments selection", margin_top: 15});
    grid.attach(selectionEnvironmentCheck, 1,2,2,1);
    selectionEnvironmentCheck.set_active(settings.get_boolean('showin-rules'));
    selectionEnvironmentCheck.connect('toggled', function(widget) {
        settings.set_boolean('showin-rules', widget.get_active());
    });
    selectionEnvironmentCheck.connect('enter-notify-event', function(widget, event) {
        infoLabel.set_label("<i>Show up only in target environments</i>");
    });
    selectionEnvironmentCheck.connect('leave-notify-event', function(widget, event) {
        infoLabel.set_label("");
    });

    grid.attach(new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, margin: 20 }), 0,3,1,1);

    let iconLabel = new Gtk.Label({ label: "<b>Icons:</b>" , use_markup: true, xalign: 0 });
    grid.attach(iconLabel, 0,4,1,1);

    let iconCheck = new Gtk.CheckButton({ label: "Show in menu item" });
    grid.attach(iconCheck, 1,4,2,1);
    iconCheck.set_active(!settings.get_boolean('icon'));
    iconCheck.connect('enter-notify-event', function(widget, event) {
        infoLabel.set_label("<i>Display icon specified in desktop entry file</i>");
    });
    iconCheck.connect('leave-notify-event', function(widget, event) {
        infoLabel.set_label("");
    });

    let iconSizeLabel = new Gtk.Label({ label: "Size:", xalign: 0 , margin_top: 5, margin_bottom: 5});
    let adjustment = new Gtk.Adjustment({ lower: 16, upper: 32, step_increment: 1 });
    let scale = new Gtk.HScale({ digits:0, adjustment: adjustment, value_pos: Gtk.PositionType.RIGHT });
    scale.set_value(settings.get_int('icon-size'));
    scale.connect('value-changed', function(widget) {
        settings.set_int('icon-size', widget.get_value());
    });

    grid.attach(iconSizeLabel, 1,5,1,1);
    grid.attach(scale, 2,5, 2,1)

    let iconTypeLabel = new Gtk.Label({ label: "Type:", xalign: 0 });
    let iconTypeFullcolorRadio = new Gtk.RadioButton({ label: "Fullcolor" });
    let iconTypeSymbolicRadio = new Gtk.RadioButton.new_with_label_from_widget(iconTypeFullcolorRadio, "Symbolic");
    grid.attach(iconTypeLabel, 1,6,1,1);
    grid.attach(iconTypeFullcolorRadio, 2,6, 1,1)
    grid.attach(iconTypeSymbolicRadio, 3,6, 1,1)
    iconTypeSymbolicRadio.set_active(settings.get_boolean('icon-symbolic'));
    iconTypeSymbolicRadio.connect('toggled', function(widget) {
        settings.set_boolean('icon-symbolic', widget.get_active());
    });
    iconTypeSymbolicRadio.connect('enter-notify-event', function(widget, event) {
        infoLabel.set_label("<i>Work only with themed icon</i>");
    });
    iconTypeSymbolicRadio.connect('leave-notify-event', function(widget, event) {
        infoLabel.set_label("");
    });

    iconCheck.connect('toggled', function(widget) {
        let active = widget.get_active();

        iconSizeLabel.set_sensitive(active);
        scale.set_sensitive(active);
        iconTypeLabel.set_sensitive(active);
        iconTypeFullcolorRadio.set_sensitive(active);
        iconTypeSymbolicRadio.set_sensitive(active);

        settings.set_boolean('icon', active);
    });

    iconCheck.set_active(settings.get_boolean('icon'));

    grid.attach(new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, margin: 20 }), 0,7,4,1);

    let integrationLabel = new Gtk.Label({ label: "<b>Integration:</b>" , use_markup: true, xalign: 0 });
    grid.attach(integrationLabel, 0,8,1,1);

    let appMenuCheck = new Gtk.CheckButton({ label: "Show quicklist in AppMenu" });
    grid.attach(appMenuCheck, 1,8,2,1);
    appMenuCheck.set_active(settings.get_boolean('in-appmenu'));
    appMenuCheck.connect('toggled', function(widget) {
        settings.set_boolean('in-appmenu', widget.get_active());    
    });
    appMenuCheck.connect('enter-notify-event', function(widget, event) {
        infoLabel.set_label("<i><span color='red'>Require restart Shell</span></i>");
    });
    appMenuCheck.connect('leave-notify-event', function(widget, event) {
        infoLabel.set_label("");
    });

    grid.attach(new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, margin: 20 }), 0,9,4,1);

    mainBox.add(grid);

    let hbox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL });

    let defaultButton = new Gtk.Button({ label: "Default"});
    hbox.pack_end(defaultButton, false, false, 5);
    defaultButton.connect('clicked', function(widget) {
        freedesktopSpecCheck.set_active(true);
        ayatanaSpecCheck.set_active(true);
        selectionEnvironmentCheck.set_active(false);
        iconCheck.set_active(true);
        scale.set_value(16);
        iconTypeFullcolorRadio.set_active(true);
        appMenuCheck.set_active(false);
    });

    mainBox.add(hbox);
    mainBox.add(infoLabel);

    mainBox.show_all();

    return mainBox;
}

