export const JudgeProposalStatus = {
    PENDING: 'PENDING',
    DECLINED: 'DECLINED',
    APPROVED: 'APPROVED',
};

export class JudgeProposal {
    public DocType: string;

    public ID: string;

    public Org: string;

    public ElectionId: string;

    public Status: string;

    constructor(Org: string, ElectionId: string) {
        this.DocType = 'judgeProposal';
        this.ID = `judgeProposal_${ElectionId}_${Org}`;
        this.Org = Org;
        this.ElectionId = ElectionId;

        this.Status = JudgeProposalStatus.PENDING;
    }

}
