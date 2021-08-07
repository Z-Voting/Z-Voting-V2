import {Object, Property} from 'fabric-contract-api';
import {EncryptedVotePartEntry} from './encryptedVotePartEntry';
import {VoteAuthorizationSection} from './voteAuthorizationSection';
import {VotePartHashSign} from './votePartHashSign';
import {VotePartPerOrg} from './votePartPerOrg';

@Object()
export class Vote {

    // public static fromJSON(voteJSON: string) {
    //     return JSON.parse(voteJSON) as Vote;
    //     // const {
    //     //     Authorization,
    //     //     ElectionId,
    //     //     VoteRandomId,
    //     //     VotePartCount,
    //     //     VotePartsSignedHashes,
    //     //     VotePartsPerOrg: parsedVotePartsPerOrg,
    //     // } = JSON.parse(voteJSON) as Vote;
    //     //
    //     // const votePartsPerOrg = parsedVotePartsPerOrg
    //     //     .map(({Org, EncryptedVoteParts}) => {
    //     //         const newVotePartPerOrg = new VotePartPerOrg(Org);
    //     //
    //     //         EncryptedVoteParts.forEach(({VotePartNumber, EncryptedVotePart}) => {
    //     //             const newEncryptedVotePartEntry = new EncryptedVotePartEntry(VotePartNumber, EncryptedVotePart);
    //     //             newVotePartPerOrg.EncryptedVoteParts.push(newEncryptedVotePartEntry);
    //     //         });
    //     //
    //     //         return newVotePartPerOrg;
    //     //     });
    //     //
    //     // return new Vote(Authorization, ElectionId, VoteRandomId, VotePartCount, VotePartsSignedHashes, votePartsPerOrg);
    // }

    @Property()
    public DocType: string;

    @Property()
    public ID: string;

    @Property('Authorization', 'VoteAuthorizationSection')
    public Authorization: VoteAuthorizationSection;

    @Property()
    public ElectionId: string;

    @Property()
    public VoteRandomId: string;

    @Property()
    public VotePartCount: number;

    @Property('VotePartsSignedHashes', 'VotePartHashSign[]')
    public VotePartsSignedHashes: VotePartHashSign[];

    @Property('VotePartsPerOrg', 'VotePartPerOrg[]')
    public VotePartsPerOrg: VotePartPerOrg[];

    constructor(Authorization: VoteAuthorizationSection, ElectionId: string, VoteRandomId: string, VotePartCount: number, VotePartsSignedHashes: VotePartHashSign[], VotePartsPerOrg: VotePartPerOrg[]) {
        this.DocType = 'vote';
        this.ID = `vote_${ElectionId}_${Authorization.UUID}`;

        this.Authorization = Authorization;
        this.ElectionId = ElectionId;
        this.VoteRandomId = VoteRandomId;
        this.VotePartCount = VotePartCount;
        this.VotePartsSignedHashes = VotePartsSignedHashes;
        this.VotePartsPerOrg = VotePartsPerOrg;
    }
}
