module DS
{
    export interface IDraggableOptions
    {
        Items: string;
        Distance: number;
        IsLimit: boolean;
        OffsetLeft: number;
        IsAutoScroll: boolean;
        IgnoreDragging: string[];
        Handle: string;
        ContainerWidth: number;
        IsMoveElement: boolean;
        IsUseHelper: boolean;
        OnDrag: Function;
        OnStart: Function;
        OnStop: Function;
    }
}