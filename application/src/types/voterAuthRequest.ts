export class VoterAuthRequest {

    public DocType: string;

    public ID: string;

    public Email: string;

    public AuthRequestData: string;

    public ElectionId: string;

    constructor(Email: string, ElectionId: string, AuthRequestData: string) {
        this.DocType = 'voterAuthRequest';
        this.ID = `voterAuthRequest_${ElectionId}_${Email}`;

        this.Email = Email;
        this.AuthRequestData = AuthRequestData;
        this.ElectionId = ElectionId;
    }
}
