import mongoose, { isValidObjectId } from "mongoose"
import { Like } from "../models/like.models.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    try {
        const { videoId } = req.params
      

        if (!videoId) {
            throw new ApiError(400, "Video Id is required")
        }

        const findLike = await Like.findOne(
            { $and: [{ video: videoId }, { likedBy: req.user?._id }] }
        )

        if (!findLike) {
            const liked = await Like.create({
                video: videoId,
                likedBy: req.user?._id
            })
            if (!liked) {
                throw new ApiError(400, "Error in liking the video")
            }

            return res
                .status(200)
                .json(
                    new ApiResponse(
                        200,
                        liked,
                        "Liked Video"
                    )
                )
        }

        const unliked = await Like.findByIdAndDelete(findLike._id)
        if (!unliked) {
            throw new ApiError(
                400,
                "Error While unlike a video"
            )
        }
        return res
            .status(204)
            .json(
                new ApiResponse(
                    204,
                    unliked,
                    "Unliked video"
                )
            )
    } catch (error) {
        throw new ApiError(400, error?.message || "Error in video like!!")
    }

})


const toggleCommentLike = asyncHandler(async (req, res) => {
    try {
        const { commentId } = req.params
        
        if (!commentId) {
            throw new ApiError(400, "Comment id is not found")
        }

        const commentLike = await Like.findOne({ $and: [{ comment: commentId }, { likedBy: req.user?._id }] })

        if (!commentLike) {
            const commentLiked = await Like.create({
                comment: commentId,
                likedBy: req.user?._id
            })

            if (!commentLiked) {

                throw new ApiError(400, "Error in liking the comment")
            }

            return res
                .status(200)
                .json(new ApiResponse(200, commentLiked, "comment liked successfully"))
        }

        const commentUnliked = await Like.findByIdAndDelete(commentLike._id)

        if (!commentUnliked) {
            throw new ApiError(400, "Error in unliking the comment")
        }

        return res
            .status(200)
            .json(new ApiResponse(200, commentUnliked, "comment is unliked"))


    } catch (error) {
        throw new ApiError(400, error?.message || "Error in comment")
    }

})


const toggleTweetLike = asyncHandler(async (req, res) => {
    try {
        const { tweetId } = req.params
        

        if (!tweetId) {
            throw new ApiError(400, "tweet id is required")
        }

        const tweetLike = await Like.findOne({ $and: [{ tweet: tweetId }, { likedBy: req.user?._id }] })

        if (!tweetLike) {
            const newTweetLike = await Like.create({
                tweet: tweetId,
                likedBy: req.user?._id

            })

            if (!newTweetLike) {
                throw new ApiError(500, "not able to add like to comment")
            }

            return res
                .status(200)
                .json(new ApiResponse(200, newTweetLike, "Tweet like successfully"))
        }

        const unLikeTweet = await Like.findByIdAndDelete(tweetLike._id)
        return res.status(204).json(new ApiResponse(
            204,
            unLikeTweet,
            "Unliked tweet"
        ))
    } catch (error) {
        throw new ApiError(400, error?.message || "Error in toggling the tweet like")
    }

}
)


const getLikedVideos = asyncHandler(async (req, res) => {
   
    const likedVod = await Like.aggregate([
        {
            $match: {
                likedBy:new mongoose.Types.ObjectId(req.user?._id),
                video: { $exists: true, $ne: null }
            }
        },
        {
            $lookup: {
                from: "videos",
                foreignField: "_id",
                localField: "video",
                as: "video",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        avatar: 1,
                                        username: 1,
                                        fullName: 1
                                    }
                                }
                            ]
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
                            videoFile: 1,
                            thumbnail: 1,
                            title: 1,
                            duration: 1,
                            views: 1,
                            owner: 1
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$video"
        },
        {
            $project: {
                video: 1,
                likedBy: 1
            }
        }
    ])
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                likedVod,
                "fetched all liked Video"
            )
        )

})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}