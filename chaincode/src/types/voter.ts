import {Object, Property} from 'fabric-contract-api';

@Object()
export class Voter {
    @Property()
    public DocType: string;

    @Property()
    public ID: string;

    @Property()
    public Org: string;

    @Property()
    public Email: string;

    @Property()
    public Name: string;

    @Property()
    public ElectionId: string;

    constructor(Name: string, Email: string, Org: string, ElectionId: string) {
        this.DocType = 'voter';
        this.ID = `voter_${ElectionId}_${Email}`;

        this.Org = Org;
        this.Email = Email;
        this.Name = Name;
        this.ElectionId = ElectionId;
    }
}
