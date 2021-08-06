export class Voter {

    public DocType: string;

    public ID: string;

    public Org: string;

    public Email: string;

    public Name: string;

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
