from pydantic import BaseModel, ConfigDict, UUID4


class AgentScope(BaseModel):
    model_config = ConfigDict(extra="forbid")

    user_id: UUID4
    class_id: UUID4
    subject_id: UUID4
    query: str


class StudentAgentScope(AgentScope):
    student_id: UUID4


class RagChunk(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    title: str
    sourceName: str
    chunkIndex: int
    content: str


class LearningGapRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")

    kind: str
    description: str
    createdAt: str


class ClassDiagnosis(BaseModel):
    model_config = ConfigDict(extra="ignore")

    summary: str
    recommendations: str
    indicators: dict[str, int]
    createdAt: str


class StudentContextResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    studentProfile: dict[str, str]
    learningGaps: list[LearningGapRecord]
