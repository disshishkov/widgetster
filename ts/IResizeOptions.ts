module DS
{
    export interface IResizeOptions
    {
        IsEnabled: boolean;
        Axes: string[];
        HandleAppendTo: string;
        HandleClass: string;
        MaxSize: number[];
        MinSize: number[];
        OnResize: Function;
        OnStart: Function;
        OnStop: Function;        
    }
}