# Apple Notification Center Service example

This ESP32 example pairs with an iPhone, subscribes to ANCS, fetches notification and app display-name attributes, and can send the notification's positive or negative action. App display names are cached by app identifier and reused across notifications and client reconnects.

The reusable ANCS implementation is provided by [`modules/ancs`](../../modules/ancs/) and included from this example's manifest.

Build and run it from this directory:

```sh
mcconfig -d -m -p esp32/moddable_two
```

Open **Settings > Bluetooth** on the iPhone and pair with **ANCS**. After the client reconnects, allow notification sharing if iOS asks. New and modified notifications are printed to the debugger.

The sample does not act on notifications by default. To exercise an action on the latest actionable notification:

```sh
mcconfig -d -m -p esp32/moddable_two ancsAction=positive
mcconfig -d -m -p esp32/moddable_two ancsAction=negative
```

`ANCSService.performAction(uid, "positive")` and `ANCSService.performAction(uid, "negative")` are intended for use by physical buttons or an application UI. Not every notification exposes both actions.
