module DS
{
    export interface IDraggableOptions
    {
        Items: string;
        Distance: number;
        IsLimit: boolean;
        IsResize: boolean;
        OffsetLeft: number;
        OffsetTop: number;
        IsAutoScroll: boolean;
        IgnoreDragging: any;
        Handle: string;
        ContainerWidth: number;
        IsMoveElement: boolean;
        IsUseHelper: boolean;
        OnDrag: Function;
        OnStart: Function;
        OnStop: Function;
    }
}