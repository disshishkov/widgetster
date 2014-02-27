/// <reference path="definitions/jquery.d.ts" />
/// <reference path="IWidgetsterOptions.ts" />
/// <reference path="ICoordsData.ts" />
/// <reference path="Coords.ts" />

module DS
{
    export class Widgetster
    {
        constructor
            (
                private _el: JQuery,
                private _options: IWidgetsterOptions
            )
        {
            console.log(this._options.BaseDimensions[1]);

            return this;
        }
    }
}

// ReSharper disable once JsFunctionCanBeConvertedToLambda
(function($) 
{
    $.fn.Widgetster = function(options)
    {
        return this.each(function ()
        {
            var el = $(this);
            if (!el.data("Widgetster"))
            {
                el.data("Widgetster", new DS.Widgetster(el, options));
            }
        });
    };
})(jQuery);