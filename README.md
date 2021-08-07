# Z-Voting-V2

Implementation for Z-Voting V2 protocol

## Architecture and Protocol

### Sample Election Structure (with metadata)

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

### Vote and VotePart Structure

![Vote Partition](https://user-images.githubusercontent.com/14174100/127883441-47162ac2-d665-42a3-8e04-24f5e15c99ae.png)

### Calculating result from Vote Parts

![Calculating result from VotePart](https://user-images.githubusercontent.com/14174100/127883514-4af52cef-1cfc-4d6c-953b-25b26d5e344a.png)

### Final Vote Structure

```json
{
  "Authorization": {
    "UUID": "RANDOM_STRING()",
    "Signatures": [
      {
        "Org": "Org1MSP",
        "Signature": "SIGN(UUID, Org1MSP_PRIVKEY)"
      },
      {
        "Org": "Org2MSP",
        "Signature": "SIGN(UUID, Org2MSP_PRIVKEY)"
      },
      {
        "Org": "Org3MSP",
        "Signature": "SIGN(UUID, Org3MSP_PRIVKEY)"
      }
    ]
  },
  "ElectionId": "election5117",
  "VoteRandomId": "RANDOM_STRING()",
  "VotePartCount": 3,
  "VotePartsSignedHashes": [
    {
      "VotePartNumber": 0,
      "VotePartHash": "Hash#0",
      "VotePartHashSign": "SIGN(Hash#0, VOTE_GENERATOR_PRIVKEY)" 
    },
    {
      "VotePartNumber": 1,
      "VotePartHash": "Hash#1",
      "VotePartHashSign": "SIGN(Hash#1, VOTE_GENERATOR_PRIVKEY)"
    },
    {
      "VotePartNumber": 2,
      "VotePartHash": "Hash#2",
      "VotePartHashSign": "SIGN(Hash#2, VOTE_GENERATOR_PRIVKEY)"
    }
  ],
  "VotePartsPerOrg": [
    {
      "Org": "Org1MSP",
      "EncryptedVoteParts": [
        {
          "VotePartNumber": 1,
          "EncryptedVotePart": "ENCRYPT(PART1_DATA, Org1MSP_PUBKEY)"
        },
        {
          "VotePartNumber": 2,
          "EncryptedVotePart": "ENCRYPT(PART2_DATA, Org1MSP_PUBKEY)"
        }
      ]
    },
    {
      "Org": "Org2MSP",
      "EncryptedVoteParts": [
        {
          "VotePartNumber": 0,
          "EncryptedVotePart": "ENCRYPT(PART0_DATA, Org2MSP_PUBKEY)"
        },
        {
          "VotePartNumber": 2,
          "EncryptedVotePart": "ENCRYPT(PART2_DATA, Org2MSP_PUBKEY)"
        }
      ]
    },
    {
      "Org": "Org3MSP",
      "EncryptedVoteParts": [
        {
          "VotePartNumber": 0,
          "EncryptedVotePart": "ENCRYPT(PART0_DATA, Org3MSP_PUBKEY)"
        },
        {
          "VotePartNumber": 1,
          "EncryptedVotePart": "ENCRYPT(PART1_DATA, Org3MSP_PUBKEY)"
        }
      ]
    }
  ]
}
```
