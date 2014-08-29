module DS
{
    export interface IWidgetsterOptions extends IDimensions
    {
        Namespace: string;
        Selector: string;
        ExtraRows: number;
        ExtraCols: number;
        MinCols: number;
        MaxCols: number;
        MinRows: number;
        MaxSizeX: number;
        SerializeParams: Function;
        Collision: ICollisionOptions;
        Draggable: IDraggableOptions;
        Resize: IResizeOptions;
    }
} 