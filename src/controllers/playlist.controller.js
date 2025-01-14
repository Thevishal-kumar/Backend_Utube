import mongoose, { isValidObjectId } from "mongoose"
import { PlayList } from "../models/playlist.models.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"


const createPlaylist = asyncHandler(async (req, res) => {
    try {
        const { name, description } = req.body

        if (!name && !description) {
            throw new ApiError(400, "Name and Description are required")
        }

        const playlist = await PlayList.create({
            name,
            description,
            onwer: req.user?._id
        })

        if (!playlist) {
            throw new ApiError(500, "Error in creating playlist")
        }

        return res
            .status(200)
            .json(new ApiResponse(200, playlist, "playlist successfully created"))
    } catch (error) {
        throw new ApiError(400, error?.message || "Something error while creating playlist")
    }

})


const getUserPlaylists = asyncHandler(async (req, res) => {
    const { userId } = req.params
 
    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid userId to get Playlist")
    }

    const findPlaylist = await PlayList.aggregate(
        [
            {
                $match: {
                    owner: new mongoose.Types.ObjectId(userId)
                }
            },
            {
                $lookup: {
                    from: "videos",
                    localField: "videos",
                    foreignField: "_id",
                    as: "videos",
                    pipeline: [
                        {
                            $lookup: {
                                from: "users",
                                localField: "owner",
                                foreignField: "_id",
                                as: "owner"
                            }
                        },
                        {
                            $addFields: {
                                owner: {
                                    $first: "$owner"
                                }
                            }
                        },
                        {
                            $project: {
                                title: 1,
                                thumbnail: 1,
                                description: 1,
                                owner: {
                                    username: 1,
                                    fullName: 1,
                                    avatar: 1,
                                }
                            }
                        }
                    ]
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "owner",
                    foreignField: "_id",
                    as: "createdBy",
                    pipeline: [
                        {
                            $project: {
                                avatar: 1,
                                fullName: 1,
                                username: 1
                            }
                        }
                    ]
                }
            },
            {
                $addFields: {
                    createdBy: {
                        $first: "$createdBy"
                    }
                }
            },
            {
                $project: {
                    videos: 1,
                    createdBy: 1,
                    name: 1,
                    description: 1
                }
            }
        ]
    )
    if (!findPlaylist) {
        throw new ApiError(
            500,
            "No such playlist found"
        )
    }
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                findPlaylist,
                "Got playlist"
            )
        )




})


const getPlaylistById = asyncHandler(async (req, res) => {
    try {
        const { playlistId } = req.params
        
        if (!isValidObjectId(playlistId)) {
            throw new ApiError(
                400,
                "Invalid PlaylistId"
            )
        }
        const findedPlaylist = await Playlist.aggregate([
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(playlistId)
                }
            },
            {
                //owner
                $lookup: {
                    from: "users",
                    localField: "owner",
                    foreignField: "_id",
                    as: "createdBy",
                    pipeline: [
                        {
                            $project: {
                                fullName: 1,
                                username: 1,
                                avatar: 1
                            }
                        }
                    ]
                }
            },
            {
                $addFields: {
                    createdBy: {
                        $first: "$createdBy"
                    }
                }
            },
            {
                //videos
                $lookup: {
                    from: "videos",
                    foreignField: "_id",
                    localField: "videos",
                    as: "videos",
                    pipeline: [
                        {
                            $lookup: {
                                from: "users",
                                localField: "owner",
                                foreignField: "_id",
                                as: "owner"
                            }
                        },
                        {
                            $addFields: {
                                owner: {
                                    $first: "$owner"
                                }
                            }
                        },
                        {
                            $project: {
                                thumbnail: 1,
                                title: 1,
                                duration: 1,
                                views: 1,
                                owner: {
                                    fullName: 1,
                                    username: 1,
                                    avatar: 1
                                },
                                createdAt: 1,
                                updatedAt: 1
                            }
                        }
                    ]
                }
            },
            {
                $project: {
                    name: 1,
                    description: 1,
                    videos: 1,
                    createdBy: 1
                }
            }
        ])
        if (!findedPlaylist[0]) {
            throw new ApiError(
                400,
                "No such Playlist found"
            )
        }
        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    findedPlaylist[0],
                    "Fetched playlist"
                )
            )
    } catch (error) {
        throw new ApiError(
            400,
            error.message || "Error while getting playlist by id"
        )
    }

})


const addVideoToPlaylist = asyncHandler(async (req, res) => {
    try {
        const { playlistId, videoId } = req.params

        if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
            throw new ApiError(400, "Invalid playlist or video ID")
        }

        const playList = await PlayList.findById(playlistId)
        if (!playList) {
            throw new ApiError(
                400,
                "No playlist found"
            )
        }

        if (!(playList.owner).equals(req.user?._id)) {
            throw new ApiError(
                400,
                "You cannot add vod in this playlist"
            )
        }

        const found = (playList.videos).filter(video => video.toString() === videoId)
        if (found.length > 0) {
            throw new ApiError(
                400,
                "Video is already in the playlist"
            )
        }

        const newVideo = [...(playList.videos), videoId]
        const newPlaylist = await PlayList.findByIdAndUpdate(
            playList._id,
            {
                $set: {
                    videos: newVideo
                }
            },
            { new: true }
        )
        if (!newPlaylist) {
            throw new ApiError(
                500,
                "Error while Adding new video"
            )
        }
        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    newPlaylist,
                    "Video added"
                )
            )
    } catch (error) {
        throw new ApiError(
            400,
            error.message || "Error while adding video to playlist"
        )
    }

})


const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    try {
        const { playlistId, videoId } = req.params
        // TODO: remove video from playlist

        if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
            throw new ApiError(400, "Invalid video id or playlist id")
        }

        const playList = await Playlist.findById(playlistId)
        if (!playList) {
            throw new ApiError(
                400,
                "cannot find playlist"
            )
        }

        if (!((playList.owner).euqals(req.user?._id))) {
            throw new ApiError(400, "You cannot delete video from playlist")
        }

        const newPlaylistVideo = (playList.videos).filter(v => v.toString() !== videoId)

        const updatePlaylistVideo = await PlayList.findByIdAndUpdate(
            playList._id,
            {
                $set: {
                    videos: newPlaylistVideo
                }
            },
            {
                new: true
            }
        )
        if (!updatePlaylist) {
            throw new ApiError(
                500,
                "Error While removing video from playlist"
            )
        }

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    updatePlaylistVideo,
                    "removed video from playlist"
                )
            )

    } catch (error) {
        throw new ApiError(400, error?.message || "Something error occur while deleting video from playlist")
    }


})


const deletePlaylist = asyncHandler(async (req, res) => {
    try {
        const { playlistId } = req.params
       

        if (!isValidObjectId(playlistId)) {
            throw new ApiError(400, "Playlist is invalid")
        }

        const findPlaylist = await Playlist.findById(playlistId)
        if (!findPlaylist) {
            throw new ApiError(
                400,
                "Not found playlist"
            )
        }

        if (!((findPlaylist.owner).equals(req.user?._id))) {
            throw new ApiError(400, "You owner can delete playlist")
        }

        const deletePlaylist = await PlayList.findByIdAndDelete(findPlaylist._id)

        if (!deletePlaylist) {
            throw new ApiError(500, "Error while deleting vod")
        }

        return res
            .status(200)
            .json(200, deletePlaylist, "Playlist deleted successfully")


    } catch (error) {
        throw new ApiError(400, error?.message || "Something Error occur while deleting playlist")
    }
})


const updatePlaylist = asyncHandler(async (req, res) => {
    try {
        const { playlistId } = req.params
        const { name, description } = req.body
       

        if (!name || !description) {
            throw new ApiError(400, "name or description required for updating the playlist")
        }

        if (!isValidObjectId(playlistId)) {
            throw new ApiError(400, "Invalid playlist Id")
        }

        const playlist = await findById(playlistId)

        if (!playlist) {
            throw new ApiError(400, "Playlist not exits")
        }

        if (!((playlist.owner).equals(req.user?._id))) {
            throw new ApiError(
                400,
                "You cannot delete it"
            )
        }
        const updatePlaylist = await PlayList.findByIdAndUpdate(playlist._id,
            {
                $set: {
                    name,
                    description
                }
            },
            {
                new: true
            }
        )

        if (!updatePlaylist) {
            throw new ApiError(400, "Error during playlisy updatation")
        }

        return res
            .status(200)
            .json(new ApiResponse(200, updatePlaylist, "Playlist update successfully"))

    } catch (error) {
        throw new ApiError(400, "Something error occur while updating playlist")
    }

})


export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}