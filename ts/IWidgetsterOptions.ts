module DS
{
    export interface IWidgetsterOptions extends IDimensions
    {
        Selector: string;
        ExtraRows: number;
        ExtraCols: number;
        MinCols: number;
        MaxCols: number;
        MinRows: number;
        SerializeParams: Function;
        Collision: ICollisionOptions;
        Draggable: IDraggableOptions;
        Resize: IResizeOptions;
    }
} 