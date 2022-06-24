import { URLSearchParams } from "url";

export type RepoFile = {
    path: string,
    branch: string
}

export type RepoDetails = {
    path: string,
    branch: string,
    pushedBranches: string[],
    localBranches: string[],
    files: RepoFile[]
}

export type Api = {
    path: string,
    method: string,
    query?: string | URLSearchParams,
    response: {
        code: number,
        data: Record<string, unknown> | unknown[],
        times?: number
    }[]
}

export type History = {
    action: string, 
    branch: string, 
    remote: string, 
    file?: {
        path: string, 
        name: string
    }
}

export type Config = {
    repositories?: {
        [key: string]: {
            pushedBranches?: string[],
            localBranches?: string[],
            currentBranch?: string,
            history?: History[]
        }
    },
    mocks?: {
        baseUrl: string,
        api: Api[]
    }
}