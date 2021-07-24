import {Object, Property} from 'fabric-contract-api';

export const ElectionStatus = {
    PENDING: 'PENDING',
    READY: 'READY',
    RUNNING: 'RUNNING',
    OVER: 'OVER',
};

@Object()
export class Election {
    @Property()
    public DocType: string;

    @Property()
    public ID: string;

    @Property()
    public Name: string;

    @Property()
    public Status: string;

    @Property()
    public Owner: string;

    @Property()
    public OwnerOrg: string;

    constructor(ID: string, Name: string, Status: string, Owner: string, OwnerOrg: string) {
        this.DocType = 'election';

        this.ID = ID;
        this.Name = Name;
        this.Status = Status;
        this.Owner = Owner;
        this.OwnerOrg = OwnerOrg;
    }
}

// @Object()
// export class Election {
//     @Property()
//     public DocType: string;
//
//     @Property()
//     public ID: string;
//
//     @Property()
//     public Name: string;
//
//     @Property()
//     public Candidates: Candidate[];
//
//     @Property()
//     public Status: string;
//
//     @Property()
//     public Owner: string;
//
//     @Property()
//     public Attributes?: any;
//
//     constructor(ID: string, Name: string, Status: string, Owner: string) {
//         this.ID = ID;
//         this.Name = Name;
//         this.Status = Status;
//         this.Owner = Owner;
//
//         this.DocType = 'election';
//         this.Candidates = [];
//     }
// }
