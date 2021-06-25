import {Object, Property} from "fabric-contract-api";

@Object()
export class Candidate {
    @Property()
    public DocType: string;

    @Property()
    public ID: string;

    @Property()
    public Name: string;

    @Property()
    public UniqueId: string;

    @Property()
    public ElectionId: string;

    constructor(ID: string, Name: string, UniqueId: string, ElectionId: string) {
        this.DocType = "candidate";

        this.ID = ID;
        this.Name = Name;
        this.UniqueId = UniqueId;

        this.ElectionId = ElectionId;
    }
}
