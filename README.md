Widgetster
===========

Widgetster is a [jQuery](http://jquery.com/) plugin to develop dashboard page based on widgets.

Widgetster is a re-wrote on [TypeScript](http://www.typescriptlang.org/) [Gridster](http://gridster.net/) which was developed by [Ducksboard](https://github.com/ducksboard).

[Download](https://bitbucket.org/DuC/widgetster/downloads) | [Usage](https://bitbucket.org/DuC/widgetster/wiki/Home) | [Demo](http://widgetster.bitbucket.org/)

## Different between Widgetster and Gridster

* Source code of `Widgetster` is `TypeScript`, source code of `Gridster` is `JavaScript`.
* `Widgetster` uses `PascalCase` notation for methods and options.
* Removed option `avoid_overlapped_widgets`. For `Widgetster` it's alwasy `true`.
* Removed option `autogenerate_stylesheet`. For `Widgetster` it's alwasy `false`. Because `Gridster` has a performance issues, which are related CSS `Widgetster` uses inline styles.
* Removed option `max_size_x`.
* Removed option `namespace`.
* Added method `ResizeWidgetDimensions`.
* Added `row` parameter to `ResizeWidget` method (former `resize_widget`).


## License

Distributed under the MIT license.