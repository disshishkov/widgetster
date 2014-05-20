module DS
{
    export interface IResizeOptions
    {
        IsEnabled: boolean;
        Axes: string[];//TODO: may be change
        HandleAppendTo: string;
        HandleClass: string;
        MaxSize: number[];
    }
}