module DS
{
    class Utils
    {
        public static Delay(func: Function, timeout: number): number
        {
            var args = Array.prototype.slice.call(arguments, 2);
            return window.setTimeout(() => { return func.apply(null, args); }, timeout);
        }

        public static Debounce(func: Function, timeout: number, isRunImmediate?: boolean): Function
        {
            var timeoutHandler: number = null;

            return function()
            {
                var context = this;
                var args = arguments;

                var runLater: Function = () =>
                {
                    timeoutHandler = null;
                    if (!isRunImmediate)
                    {
                        func.apply(context, args);
                    }
                };

                if (isRunImmediate && !timeoutHandler)
                {
                    func.apply(context, args);
                }

                window.clearTimeout(timeoutHandler);
                timeoutHandler = window.setTimeout(runLater, timeout);
            };
        }

        public static Throttle(func: Function, timeout: number): Function
        {
            var timeoutHandler: number = null;
            var isMore: boolean = false;
            var isThrottling: boolean = false;

            var whenDone: Function = Utils.Debounce(() =>
            {
                isMore = false;
                isThrottling = false;
            }, timeout);

            return function()
            {
                var context = this;
                var args = arguments;

                var runLater: Function = () =>
                {
                    timeoutHandler = null;
                    if (isMore)
                    {
                        func.apply(context, args);
                    }
                    whenDone();
                };

                if (!timeoutHandler)
                {
                    timeoutHandler = window.setTimeout(runLater, timeout);
                }

                var result: Function = null;

                if (isThrottling)
                {
                    isMore = true;
                }
                else
                {
                    result = func.apply(context, args);
                }
                whenDone();
                isThrottling = true;

                return result;
            };
        }
    }
}