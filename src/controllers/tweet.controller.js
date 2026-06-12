import mongoose, { isValidObjectId } from "mongoose"
import { Tweet } from "../models/tweet.models.js"
import { User } from "../models/user.models.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
   
    try {
        const { content } = req.body

        if (!content) {
            throw new ApiError(400, "Content is required for tweet")
        }

        const contentTweet = await Tweet.create({
            content,
            owner: req.user?._id
            // IMPORTANT
            //The owner ID for the tweet is retrieved from req.user._id, 
            // which is set by the authentication middleware that verifies the user's identity.
        })

        if (!contentTweet) {
            throw new ApiError(400, "Error While tweet is creating and saved")
        }
        return res
            .status(200)
            .json(new ApiResponse(
                200,
                contentTweet,
                "tweet is created"
            ))
    } catch (error) {
        throw new ApiError(400, error.message || "Something went Wrong while creating tweet")
    }
})

const getUserTweets = asyncHandler(async (req, res) => {
   
    try {
        const user = await User.findById(req.params.userId)
        if (!user) {
            throw new ApiError(
                400,
                "User do not exist"
            )
        }

        const tweet = await Tweet.find({ owner: user._id })

        if (tweet.length === 0) {
            throw new ApiError(404, "No tweets found")
        }

        return res
            .status(200)
            .json(new ApiResponse(
                200,
                { tweet },
                "Fetched Tweet"
            ))
    } catch (error) {
        throw new ApiError(400, error?.message || "Error while getting tweet user")
    }

})

const updateTweet = asyncHandler(async (req, res) => {
   
    try {

        const { content } = req.body
        if (!content) {
            throw new ApiError(
                400,
                "Please fill the Required fields"
            )
        }
        const { tweetId } = req.params
        if (!tweetId) {
            throw new ApiError(400, "Tweet ID is required")
        }

        const tweet = await Tweet.findById(tweetId)

        if (!tweet) {
            throw new ApiError(400, "Tweet not found")
        }

        if (!((tweet?.owner).equals(req.user?._id))) {
            throw new ApiError(
                400,
                "You are not Allowed to Change the Tweet"
            )
        }

        const tweetNewContent = await Tweet.findByIdAndUpdate(tweetId, {
            $set: {
                content
            }
        }, {
            new: true
        })

        if (!tweetNewContent) {
            throw new ApiError(400, "Error in updating tweet!!")
        }

        return res
            .status(200)
            .json(new ApiResponse(200, { tweetNewContent }, "Tweet update successfully"))
    } catch (error) {
        throw new ApiError(400, error?.message || "Error in updating tweet")
    }
})

const deleteTweet = asyncHandler(async (req, res) => {
   
    try {
        const { tweetId } = req.params

        if (!tweetId) {
            throw new ApiError(400, "Tweet Id is required to delete tweet")
        }

        const tweet = await Tweet.findById(tweetId)

        if (!tweet) {
            throw new ApiError(400, "tweet not exist")
        }

        if (!((tweet?.owner).equals(req.user?._id))) {
            throw new ApiError(400, "You cannot delete this tweet")
        }

        const deletedTweet = await Tweet.findByIdAndDelete(tweet._id)

        if (!deletedTweet) {
            throw new ApiError(400, "Error While Deleting the data")
        }

        return res
            .status(200)
            .json(new ApiResponse(200, {}, "Tweet deleted successfully"))
    } catch (error) {
        throw new ApiError(400, error?.message || "Error in deleting tweet")
    }
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}