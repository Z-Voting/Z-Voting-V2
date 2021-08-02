# Z-Voting-V2

Implementation for Z-Voting V2 protocol

## Architecture and Protocol

**Sample Election Structure (with metadata):**

```json
{
  "DocType": "election",
  "ID": "election5117",
  "Metadata": {
    "JudgeCount": 1,
    "Judges": [
      {
        "DocType": "judgeProposal",
        "ElectionId": "election5117",
        "ID": "judgeProposal_election5117_Org1MSP",
        "Org": "Org1MSP",
        "Status": "APPROVED"
      },
      {
        "DocType": "judgeProposal",
        "ElectionId": "election5117",
        "ID": "judgeProposal_election5117_Org2MSP",
        "Org": "Org2MSP",
        "Status": "APPROVED"
      },
      {
        "DocType": "judgeProposal",
        "ElectionId": "election5117",
        "ID": "judgeProposal_election5117_Org3MSP",
        "Org": "Org3MSP",
        "Status": "APPROVED"
      }
    ],
    "JudgesPerVotePart": [
      ["Org2Msp", "Org3Msp"],
      ["Org1MSP", "Org3Msp"],
      ["Org1MSP", "Org2Msp"]
    ],
    "TrustThreshold": 1,
    "VotePartCopies": 2,
    "VotePartCount": 3,
    "VotePartsPerJudge": [
      {
        "Org": "Org2Msp",
        "VoteParts": [0,2]
      },
      {
        "Org": "Org3Msp",
        "VoteParts": [0,1]
      },
      {
        "Org": "Org1MSP",
        "VoteParts": [1,2]
      }
    ]
  },
  "Name": "election 5117",
  "Owner": "x509::/OU=org1/OU=client/OU=department1/CN=appUser::/C=US/ST=North Carolina/L=Durham/O=org1.example.com/CN=ca.org1.example.com@Org1MSP",
  "OwnerOrg": "Org1MSP",
  "Status": "RUNNING"
}
```
