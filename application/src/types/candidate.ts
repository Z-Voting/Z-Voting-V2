export class Candidate {

    public DocType: string;

    public ID: string;

    public Name: string;

    public UniqueId: string;

    public ElectionId: string;

    constructor(ID: string, Name: string, UniqueId: string, ElectionId: string) {
        this.DocType = 'candidate';

        this.ID = ID;
        this.Name = Name;
        this.UniqueId = UniqueId;

        this.ElectionId = ElectionId;
    }
}
