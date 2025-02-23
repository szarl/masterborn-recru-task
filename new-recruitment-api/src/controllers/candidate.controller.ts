import { Response, Request } from "express";
import { db as candidatesDB } from "../db";
import { legacyApiClient } from '../legacyApiClient';

// Enums
enum RecruitmentStatus {
  NEW = 'new',
  IN_PROGRESS = 'in_progress',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected'
}

// Interfaces
interface Note {
  id: string;
  content: string;
  recruiterId: number;
  createdAt: string;
}

interface Candidate {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  yearsOfExperience: number;
  jobOfferIds: number[];
  status: RecruitmentStatus;
  consentDate: string;
  notes: Note[];
  createdAt: string;
  updatedAt: string;
}

interface PaginationQuery {
  page?: string;
  jobOfferId?: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// Constants
const ITEMS_PER_PAGE = 50;


// Validation
const validateCandidate = (candidate: Partial<Candidate>): ValidationResult => {
  const errors: string[] = [];

  if (!candidate.firstName) {
    errors.push("First name is required");
  }

  if (!candidate.lastName) {
    errors.push("Last name is required");
  }

  if (!candidate.email) {
    errors.push("Email is required");
  }

  if (candidate.email && !/\S+@\S+\.\S+/.test(candidate.email)) {
    errors.push("Invalid email format");
  }

  if (!candidate.phone) {
    errors.push("Phone number is required");
  }

  if (candidate.yearsOfExperience === undefined) {
    errors.push("Years of experience is required");
  }

  if (!candidate.jobOfferIds?.length) {
    errors.push("At least one job offer must be assigned");
  }

  if (!candidate.consentDate) {
    errors.push("Recruitment consent date is required");
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};


export const addCandidate = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      yearsOfExperience,
      jobOfferIds,
      consentDate,
    } = req.body;

    const newCandidate: Candidate = {
      id: Date.now().toString(),
      firstName,
      lastName,
      email,
      phone,
      yearsOfExperience,
      jobOfferIds,
      consentDate,
      status: RecruitmentStatus.NEW,
      notes: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const existingCandidate = await candidatesDB.get('SELECT Candidate WHERE email = ?', email);
    console.log(existingCandidate)
    if (existingCandidate) {
        res
        .status(409)
        .json({ message: "Candidate with this email already exists." });
    }

    const { isValid, errors } = validateCandidate(newCandidate);
    if (!isValid) {
        res
        .status(400)
        .json({ message: "Validation failed", errors });
    }

    try {
      await legacyApiClient.createCandidate({
        name: `${firstName} ${lastName}`,
        email: email,
      });
    } catch (error) {
      console.error('Legacy system sync failed:', error);
    }

    candidatesDB.run(`INSERT INTO Candidate ?`, newCandidate);

     res
      .status(201)
      .json({ message: "Candidate added successfully", candidate: newCandidate });
  } catch (error) {
    console.error('Error adding candidate:', error);
     res.status(500).json({ message: "Internal server error" });
  }
};

// export const getCandidates = async (req: Request<{}, {}, {}, PaginationQuery>, res: Response): Promise<void> => {
//   try {
//     const page = parseInt(req.query.page || '1');
//     const jobOfferId = req.query.jobOfferId;
    
//     let filteredCandidates = await candidatesDB.all('SELECT * FROM Candidate', (test, foo) => {

//     });

//     if (jobOfferId) {
//       filteredCandidates = filteredCandidates.filter(candidate => 
//         candidate.jobOfferIds.includes(parseInt(jobOfferId))
//       );
//     }

//     const totalCandidates = filteredCandidates.length;
//     const totalPages = Math.ceil(totalCandidates / ITEMS_PER_PAGE);
    
//     const paginatedCandidates = filteredCandidates
//       .slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

//      res.status(200).json({
//       candidates: paginatedCandidates,
//       pagination: {
//         currentPage: page,
//         totalPages,
//         totalItems: totalCandidates,
//         itemsPerPage: ITEMS_PER_PAGE
//       }
//     });
//   } catch (error) {
//     console.error('Error getting candidates:', error);
//      res.status(500).json({ message: "Internal server error" });
//   }
// };

// export const getCandidateById = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
//   try {
//     const { id } = req.params;
//     const candidate = candidatesDB.find(c => c.id === id);

//     if (!candidate) {
//        res.status(404).json({ message: "Candidate not found" });
//     }

//      res.status(200).json(candidate);
//   } catch (error) {
//     console.error('Error getting candidate:', error);
//      res.status(500).json({ message: "Internal server error" });
//   }
// };

// export const updateCandidate = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
//   try {
//     const { id } = req.params;
//     const updateData: Partial<Candidate> = req.body;
    
//     const candidateIndex = candidatesDB.findIndex(c => c.id === id);
    
//     if (candidateIndex === -1) {
//        res.status(404).json({ message: "Candidate not found" });
//     }

//     if (updateData.email && updateData.email !== candidatesDB[candidateIndex].email) {
//       const emailExists = candidatesDB.some(
//         c => c.email === updateData.email && c.id !== id
//       );
//       if (emailExists) {
//          res.status(409).json({ message: "Email already in use" });
//       }
//     }

//     const updatedCandidate: Candidate = {
//       ...candidatesDB[candidateIndex],
//       ...updateData,
//       updatedAt: new Date().toISOString()
//     };

//     const { isValid, errors } = validateCandidate(updatedCandidate);
//     if (!isValid) {
//        res
//         .status(400)
//         .json({ message: "Validation failed", errors });
//     }

//     candidatesDB[candidateIndex] = updatedCandidate;

//      res.status(200).json({
//       message: "Candidate updated successfully",
//       candidate: updatedCandidate
//     });
//   } catch (error) {
//     console.error('Error updating candidate:', error);
//      res.status(500).json({ message: "Internal server error" });
//   }
// };

// export const deleteCandidate = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
//   try {
//     const { id } = req.params;
//     const candidateIndex = candidatesDB.findIndex(c => c.id === id);

//     if (candidateIndex === -1) {
//        res.status(404).json({ message: "Candidate not found" });
//     }

//     try {
//       await legacyApiClient.deleteCandidate(candidatesDB[candidateIndex].email);
//     } catch (error) {
//       console.error('Legacy system delete failed:', error);
//     }

//     candidatesDB.splice(candidateIndex, 1);

//      res.status(200).json({ message: "Candidate deleted successfully" });
//   } catch (error) {
//     console.error('Error deleting candidate:', error);
//      res.status(500).json({ message: "Internal server error" });
//   }
// };

// export const addCandidateNote = async (
//   req: Request<{ id: string }, {}, { content: string; recruiterId: number }>,
//   res: Response
// ): Promise<void> => {
//   try {
//     const { id } = req.params;
//     const { content, recruiterId } = req.body;

//     const candidate = candidatesDB.find(c => c.id === id);
    
//     if (!candidate) {
//        res.status(404).json({ message: "Candidate not found" });
//     }

//     if (!content) {
//        res.status(400).json({ message: "Note content is required" });
//     }

//     const newNote: Note = {
//       id: Date.now().toString(),
//       content,
//       recruiterId,
//       createdAt: new Date().toISOString()
//     };

//     candidate.notes.push(newNote);
//     candidate.updatedAt = new Date().toISOString();

//      res.status(201).json({
//       message: "Note added successfully",
//       note: newNote
//     });
//   } catch (error) {
//     console.error('Error adding note:', error);
//      res.status(500).json({ message: "Internal server error" });
//   }
// };