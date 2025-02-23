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

    const existingCandidate = await candidatesDB.get('SELECT * FROM Candidate WHERE email = ?', email);
    if (Object.values(existingCandidate).length) {
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
      const response =  await legacyApiClient.createCandidate({
        name: `${firstName} ${lastName}`,
        email: email,
      });
      // TODO: handle response error
    } catch (error) {
      console.error('Legacy system sync failed:', error);
    }

    await candidatesDB.run(`INSERT INTO Candidate (first_name, last_name, email, phone, years_of_experience, consent_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
      newCandidate.firstName,
      newCandidate.lastName,
      newCandidate.email,
      newCandidate.phone,
      newCandidate.yearsOfExperience,
      newCandidate.consentDate,
      newCandidate.createdAt,
      newCandidate.updatedAt
    ]);

    // TODO: insert default relations

     res
      .status(201)
      .json({ message: "Candidate added successfully", candidate: newCandidate });
  } catch (error) {
    console.error('Error adding candidate:', error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getCandidates = async (req: Request<{}, {}, {}, PaginationQuery>, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page || '1');
    const jobOfferId = req.query.jobOfferId;
    
    let query = 'SELECT c.*, GROUP_CONCAT(cjo.job_offer_id) as job_offer_ids FROM Candidate c LEFT JOIN CandidateJobOffer cjo ON c.id = cjo.candidate_id';
    let params: any[] = [];
    
    if (jobOfferId) {
      query += ' WHERE cjo.job_offer_id = ?';
      params.push(jobOfferId);
    }
    
    query += ' GROUP BY c.id';
    query += ' LIMIT ? OFFSET ?';
    
    const offset = (page - 1) * ITEMS_PER_PAGE;
    params.push(ITEMS_PER_PAGE, offset);

    const candidates = await candidatesDB.all(query, params);
    const result = await candidatesDB.all('SELECT COUNT(DISTINCT c.id) as total FROM Candidate c' +
      (jobOfferId ? ' LEFT JOIN CandidateJobOffer cjo ON c.id = cjo.candidate_id WHERE cjo.job_offer_id = ?' : ''),
      jobOfferId ? [jobOfferId] : []);
      // @ts-ignore
    const total = result[0]?.total ?? 0;

    const totalCandidates = total;
    const totalPages = Math.ceil(totalCandidates / ITEMS_PER_PAGE);
    
     // @ts-ignore
    const formattedCandidates = candidates?.map(c => ({
      ...c,
      jobOfferIds: c.job_offer_ids ? c.job_offer_ids.split(',').map(Number) : []
    }));

     res.status(200).json({
      candidates: formattedCandidates,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalCandidates,
        itemsPerPage: ITEMS_PER_PAGE
      }
    });
  } catch (error) {
    console.error('Error getting candidates:', error);
     res.status(500).json({ message: "Internal server error" });
  }
};

export const getCandidateById = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const query = `
      SELECT c.*, GROUP_CONCAT(cjo.job_offer_id) as job_offer_ids 
      FROM Candidate c 
      LEFT JOIN CandidateJobOffer cjo ON c.id = cjo.candidate_id 
      WHERE c.id = ?
      GROUP BY c.id`;

    const candidate = await candidatesDB.get(query, [id]);

    if (!candidate) {
      res.status(404).json({ message: "Candidate not found" });
      return;
    }

    const formattedCandidate = {
      ...candidate,
      jobOfferIds: (candidate as any).job_offer_ids ? (candidate as any).job_offer_ids.split(',').map(Number) : []
    };

    res.status(200).json(formattedCandidate);
  } catch (error) {
    console.error('Error getting candidate:', error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateCandidate = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData: Partial<Candidate> = req.body;
    
    const candidate = await candidatesDB.get('SELECT * FROM Candidate WHERE id = ?', [id]) as unknown as Candidate;
    
    if (!candidate) {
      res.status(404).json({ message: "Candidate not found" });
      return;
    }

    if (updateData.email && updateData.email !== candidate.email) {
      const existingCandidate = await candidatesDB.get('SELECT * FROM Candidate WHERE email = ? AND id != ?', [updateData.email, id]);
      if (existingCandidate) {
        res.status(409).json({ message: "Email already in use" });
        return;
      }
    }

    const updatedCandidate: Candidate = {
      ...candidate,
      ...updateData,
      updatedAt: new Date().toISOString()
    };

    const { isValid, errors } = validateCandidate(updatedCandidate);
    if (!isValid) {
      res.status(400).json({ message: "Validation failed", errors });
      return;
    }

    await candidatesDB.run(
      `UPDATE Candidate SET 
        first_name = ?, 
        last_name = ?, 
        email = ?, 
        phone = ?, 
        years_of_experience = ?, 
        consent_date = ?, 
        updated_at = ? 
      WHERE id = ?`,
      [
        updatedCandidate.firstName,
        updatedCandidate.lastName,
        updatedCandidate.email,
        updatedCandidate.phone,
        updatedCandidate.yearsOfExperience,
        updatedCandidate.consentDate,
        updatedCandidate.updatedAt,
        id
      ]
    );

    if (updateData.jobOfferIds) {
      await candidatesDB.run('DELETE FROM CandidateJobOffer WHERE candidate_id = ?', [id]);
      for (const jobOfferId of updateData.jobOfferIds) {
        await candidatesDB.run(
          'INSERT INTO CandidateJobOffer (candidate_id, job_offer_id) VALUES (?, ?)',
          [id, jobOfferId]
        );
      }
    }

    res.status(200).json({
      message: "Candidate updated successfully",
      candidate: updatedCandidate
    });
  } catch (error) {
    console.error('Error updating candidate:', error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteCandidate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const candidate = await candidatesDB.get('SELECT * FROM Candidate WHERE id = ?', [id]);

    if (!candidate) {
      res.status(404).json({ message: "Candidate not found" });
      return;
    }

    try {
      // TODO: delete from legacy api
      // await legacyApiClient.deleteCandidate(candidate.email);
    } catch (error) {
      console.error('Legacy system delete failed:', error);
    }

    await candidatesDB.run('DELETE FROM CandidateJobOffer WHERE candidate_id = ?', [id]);
    await candidatesDB.run('DELETE FROM Candidate WHERE id = ?', [id]);

    res.status(200).json({ message: "Candidate deleted successfully" });
  } catch (error) {
    console.error('Error deleting candidate:', error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const addCandidateNote = async (
  req: Request<{ id: string }, {}, { content: string; recruiterId: number }>,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { content, recruiterId } = req.body;

    const candidate = await candidatesDB.get('SELECT * FROM Candidate WHERE id = ?', [id]);
    
    if (!candidate) {
      res.status(404).json({ message: "Candidate not found" });
      return;
    }

    if (!content) {
      res.status(400).json({ message: "Note content is required" });
      return;
    }

    const newNote: Note = {
      id: Date.now().toString(),
      content,
      recruiterId,
      createdAt: new Date().toISOString()
    };

    await candidatesDB.run(
      'INSERT INTO CandidateNote (id, candidate_id, content, recruiter_id, created_at) VALUES (?, ?, ?, ?, ?)',
      [newNote.id, id, content, recruiterId, newNote.createdAt]
    );

    await candidatesDB.run(
      'UPDATE Candidate SET updated_at = ? WHERE id = ?',
      [new Date().toISOString(), id]
    );

    res.status(201).json({
      message: "Note added successfully",
      note: newNote
    });
  } catch (error) {
    console.error('Error adding note:', error);
    res.status(500).json({ message: "Internal server error" });
  }
};