import {Object, Property} from 'fabric-contract-api';

@Object()
export class VoterAuthRequest {
    @Property()
    public DocType: string;

    @Property()
    public ID: string;

    @Property()
    public Email: string;

    @Property()
    public AuthRequestData: string;

    @Property()
    public ElectionId: string;

    constructor(Email: string, ElectionId: string, AuthRequestData: string) {
        this.DocType = 'voterAuthRequest';
        this.ID = `voterAuthRequest_${ElectionId}_${Email}`;

        this.Email = Email;
        this.AuthRequestData = AuthRequestData;
        this.ElectionId = ElectionId;
    }
}
