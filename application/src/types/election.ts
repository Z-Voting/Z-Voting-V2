import {ElectionMetadata} from './electionMetadata';

export const ElectionStatus = {
    PENDING: 'PENDING',
    READY: 'READY',
    RUNNING: 'RUNNING',
    OVER: 'OVER',
};

export class Election {

    public DocType: string;

    public ID: string;

    public Name: string;

    public Status: string;

    public Owner: string;

    public OwnerOrg: string;

    public Metadata: ElectionMetadata;

    constructor(ID: string, Name: string, Status: string, Owner: string, OwnerOrg: string) {
        this.DocType = 'election';

        this.ID = ID;
        this.Name = Name;
        this.Status = Status;
        this.Owner = Owner;
        this.OwnerOrg = OwnerOrg;

        this.Metadata = new ElectionMetadata();
    }
}
