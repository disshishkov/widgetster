module DS
{
    export class DraggableData
    {
        public Position: JQueryCoordinates;
        public PrevPosition: JQueryCoordinates;
        public Pointer: IPointerData;
        public Player: JQuery;
        public Helper: JQuery;
    }
}